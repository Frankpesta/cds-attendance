import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware runs on Edge runtime - Prisma cannot run here.
 * We only check cookie presence; session validation and role checks
 * happen in the authenticated layout (Node.js) via getSessionAction.
 */

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/favicon.ico", "/_next", "/api", "/assets"]);

// Token-based documentation routes that should be public (no auth required)
const isPublicDocumentationRoute = (pathname: string): boolean => {
  if (pathname.startsWith("/documentation/corp-members/") && pathname !== "/documentation/corp-members") return true;
  if (pathname.startsWith("/documentation/employers/") && pathname !== "/documentation/employers") return true;
  if (pathname.startsWith("/documentation/rejected-reposting/") && pathname !== "/documentation/rejected-reposting") return true;
  if (pathname.startsWith("/documentation/corp-member-requests/") && pathname !== "/documentation/corp-member-requests") return true;
  return false;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if ([...PUBLIC_PATHS].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (isPublicDocumentationRoute(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session_token")?.value || "";
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};


