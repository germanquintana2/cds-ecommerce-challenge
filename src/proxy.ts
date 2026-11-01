import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginPath } from "~/lib/return-path";
import { getSessionCookie } from "better-auth/cookies";

const authRoutes = ["/login", "/signup"];
const publicRoutes = ["/", "/cart", ...authRoutes];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isPublic =
    publicRoutes.includes(pathname) ||
    pathname === "/products" ||
    pathname.startsWith("/products/");
  if (!isPublic && !sessionCookie) {
    const login = new URL(
      loginPath(pathname + request.nextUrl.search),
      request.url,
    );
    return NextResponse.redirect(login);
  }

  // A cookie can outlive its database session. Keep login/signup reachable so
  // the server's session check cannot bounce back into a redirect loop.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
