import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const authRoutes = ["/login", "/signup"];
const publicRoutes = ["/", ...authRoutes];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!publicRoutes.includes(pathname) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // A cookie can outlive its database session. Keep login/signup reachable so
  // the server's session check cannot bounce back into a redirect loop.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
