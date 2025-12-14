import { NextResponse, type NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/favicon.ico", "/_next", "/api", "/assets"]);

// Token-based documentation routes that should be public (no auth required)
const isPublicDocumentationRoute = (pathname: string): boolean => {
  // Allow /documentation/corp-members/[token] and all sub-paths
  if (pathname.startsWith("/documentation/corp-members/") && pathname !== "/documentation/corp-members") {
    return true;
  }
  // Allow /documentation/employers/[token]
  if (pathname.startsWith("/documentation/employers/") && pathname !== "/documentation/employers") {
    return true;
  }
  return false;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Skip assets and public routes
  if ([...PUBLIC_PATHS].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  
  // Allow public documentation routes (token-based registration forms)
  if (isPublicDocumentationRoute(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session_token")?.value || "";
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const sess = await client.query(api.auth.getSession, { sessionToken: token });
    if (!sess) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Role-based guard for /qr (admin/super_admin only)
    if (pathname.startsWith("/qr") && !(sess.user.role === "admin" || sess.user.role === "super_admin")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Restrict attendance monitor to admin/super_admin only
    if (pathname.startsWith("/attendance-monitor") && !(sess.user.role === "admin" || sess.user.role === "super_admin")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Restrict super admin areas
    if (pathname.startsWith("/groups") || pathname.startsWith("/reports")) {
      if (sess.user.role !== "super_admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    // Restrict documentation admin routes to admin/super_admin only
    // (public token-based routes are already handled above, so this only affects admin routes)
    if (pathname.startsWith("/documentation") && !isPublicDocumentationRoute(pathname)) {
      if (!(sess.user.role === "admin" || sess.user.role === "super_admin")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  } catch {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/(.*)"],
};


