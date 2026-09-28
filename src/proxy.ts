import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: bounce requests without a session cookie to /login.
 * Real authentication and role checks happen server-side in every page,
 * action and route handler (src/server/auth).
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("rq_session");
  const { pathname, search } = request.nextUrl;
  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
