import { type NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, GOOGLE_FLOW_COOKIE, type GoogleFlow, type GoogleProfile } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

function readFlow(request: NextRequest): GoogleFlow | null {
  const raw = request.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleFlow;
  } catch {
    return null;
  }
}

/** Google 계정으로 사용자를 찾는다. 같은 이메일로 가입한 계정이 있으면 연결하고, 없으면 새로 만든다. */
async function findOrCreateUser({ sub, email }: GoogleProfile) {
  const linked = await prisma.user.findUnique({ where: { googleId: sub }, select: { id: true } });
  if (linked) return linked;

  const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true, googleId: true } });
  if (byEmail) {
    // 이미 다른 Google 계정과 연결된 이메일이면 덮어쓰지 않는다.
    if (byEmail.googleId) return null;
    return prisma.user.update({ where: { id: byEmail.id }, data: { googleId: sub }, select: { id: true } });
  }

  return prisma.user.create({ data: { email, googleId: sub }, select: { id: true } });
}

export async function GET(request: NextRequest) {
  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
    response.cookies.delete({ name: GOOGLE_FLOW_COOKIE, path: "/api/auth/google" });
    return response;
  };

  const params = request.nextUrl.searchParams;
  // 사용자가 동의 화면에서 취소하면 error=access_denied로 돌아온다.
  if (params.get("error")) return fail("google_denied");

  const flow = readFlow(request);
  const code = params.get("code");
  if (!flow || !code || params.get("state") !== flow.state) return fail("google_failed");

  try {
    const user = await findOrCreateUser(await exchangeGoogleCode(code, flow));
    if (!user) return fail("google_conflict");
    await createSession(user.id);
  } catch (error) {
    console.error("[google] 로그인 실패", error);
    return fail("google_failed");
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: GOOGLE_FLOW_COOKIE, path: "/api/auth/google" });
  return response;
}
