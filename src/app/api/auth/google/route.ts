import { type NextRequest, NextResponse } from "next/server";
import {
  createGoogleAuthRequest,
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_MAX_AGE,
  isGoogleConfigured,
} from "@/lib/google";

/** Google 동의 화면으로 보낸다. 콜백에서 대조할 값은 임시 쿠키에 담는다. */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/auth/google/callback", request.url).toString();
  const { url, flow } = await createGoogleAuthRequest(redirectUri);

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Google에서 돌아오는 최상위 GET 이동에는 lax 쿠키가 실린다
    path: "/api/auth/google",
    maxAge: GOOGLE_FLOW_MAX_AGE,
  });
  return response;
}
