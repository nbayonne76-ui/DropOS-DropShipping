import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIX = "/dashboard";
const PUBLIC_PATHS = ["/login", "/register", "/", "/api"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow all public paths and API routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protect /dashboard/* routes
  if (pathname.startsWith(PROTECTED_PREFIX)) {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
