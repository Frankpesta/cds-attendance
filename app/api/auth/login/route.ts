import { NextRequest, NextResponse } from "next/server";
import * as authRepo from "@/lib/repositories/auth";

/**
 * POST /api/auth/login - Form POST for login.
 * Returns 302 redirect on success (browser follows, URL updates).
 * Returns 302 to /login?error=... on failure.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const stateCode = String(formData.get("stateCode") || "").trim();
    const password = String(formData.get("password") || "");
    const deviceFingerprint = String(formData.get("deviceFingerprint") || "").trim();
    let nextPath = String(formData.get("next") || "/dashboard").trim() || "/dashboard";
    if (nextPath === "/") nextPath = "/dashboard";

    if (!stateCode || !password) {
      return NextResponse.redirect(new URL("/login?error=Missing+credentials", request.url));
    }

    const res = await authRepo.login(stateCode, password, deviceFingerprint || undefined);

    const response = NextResponse.redirect(new URL(nextPath, request.url), 302);
    response.cookies.set("session_token", res.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=Invalid+credentials", request.url));
  }
}
