import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Google OAuth 2.0 (OpenID Connect) 인가 코드 + PKCE 흐름.
// 라이브러리 없이 직접 구현하고, ID 토큰은 Google 공개 키로 서명을 검증한다.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** state·nonce·code_verifier를 콜백까지 들고 가는 임시 쿠키 */
export const GOOGLE_FLOW_COOKIE = "diary_google_flow";
export const GOOGLE_FLOW_MAX_AGE = 60 * 10; // 10분

export type GoogleFlow = { state: string; nonce: string; verifier: string; redirectUri: string };
export type GoogleProfile = { sub: string; email: string };

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET 환경 변수가 없습니다.");
  }
  return { clientId, clientSecret };
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function randomToken(bytes = 32) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

/** Google 동의 화면 주소와, 콜백에서 대조할 값을 만든다. */
export async function createGoogleAuthRequest(redirectUri: string) {
  const { clientId } = getConfig();
  const flow: GoogleFlow = { state: randomToken(), nonce: randomToken(), verifier: randomToken(48), redirectUri };

  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await codeChallenge(flow.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return { url, flow };
}

/** 인가 코드를 토큰으로 바꾸고, ID 토큰을 검증해 사용자 정보를 꺼낸다. */
export async function exchangeGoogleCode(code: string, flow: GoogleFlow): Promise<GoogleProfile> {
  const { clientId, clientSecret } = getConfig();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: flow.redirectUri,
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google 토큰 교환 실패 (${res.status}): ${await res.text()}`);
  }
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google 응답에 id_token이 없습니다.");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (payload.nonce !== flow.nonce) throw new Error("ID 토큰의 nonce가 맞지 않습니다.");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("ID 토큰에 sub 또는 email이 없습니다.");
  }
  // 확인되지 않은 이메일로는 기존 계정과 연결하지 않도록 아예 받지 않는다.
  if (payload.email_verified !== true) throw new Error("Google 계정의 이메일이 확인되지 않았습니다.");

  return { sub: payload.sub, email: payload.email.trim().toLowerCase() };
}
