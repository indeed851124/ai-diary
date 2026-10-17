import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "diary_session";

// 쿠키 유무만 보는 낙관적 검사. 서명과 만료 검증은 페이지와 API에서 다시 한다.
// (로그인 페이지에서 "/"로 되돌려 보내지 않는다. 만료된 쿠키가 있으면 리다이렉트가 무한 반복된다.)
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/diary/:path*"],
};
