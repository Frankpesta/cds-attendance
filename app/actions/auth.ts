"use server";

import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as authRepo from "@/lib/repositories/auth";

/** True when cookie must be Secure (HTTPS — Vercel prod/preview). */
function useSecureCookies() {
  return process.env.NODE_ENV === "production";
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: useSecureCookies(),
    path: "/",
    maxAge: 60 * 60 * 24,
  };
}

/**
 * Sign in — sets httpOnly session cookie. Errors are returned in the body (no ?error= in URL).
 */
export async function loginAction(formData: FormData) {
  const stateCode = String(formData.get("stateCode") || "").trim();
  const password = String(formData.get("password") || "");
  const deviceFingerprint = String(formData.get("deviceFingerprint") || "").trim();
  let nextPath = String(formData.get("next") || "/dashboard").trim() || "/dashboard";
  if (nextPath === "/") nextPath = "/dashboard";
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    nextPath = "/dashboard";
  }

  if (!stateCode || !password) {
    return { ok: false as const, error: "Please enter your state code and password." };
  }

  try {
    const res = await authRepo.login(
      stateCode,
      password,
      deviceFingerprint || undefined,
    );
    const c = await cookies();
    c.set("session_token", res.sessionToken, sessionCookieOptions());
    return { ok: true as const, redirect: nextPath };
  } catch (e: unknown) {
    const message = extractErrorMessage(
      e,
      "Sign in failed. Please check your credentials.",
    );
    return { ok: false as const, error: message };
  }
}

export async function logoutAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (token) {
    try {
      await authRepo.logout(token);
    } catch {
      // Ignore errors on logout
    }
  }
  c.delete("session_token");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const state_code = String(formData.get("state_code") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();

  if (!name || !email || !state_code || !password || !confirmPassword) {
    return { ok: false, error: "All fields are required" } as const;
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match" } as const;
  }

  try {
    const res = await authRepo.signup(
      name,
      email,
      state_code,
      password,
      cds_group_id || undefined,
    );

    const c = await cookies();
    c.set("session_token", res.sessionToken, sessionCookieOptions());

    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to sign up"),
    } as const;
  }
}

export async function changePasswordAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  if (!currentPassword || !newPassword) {
    return { ok: false, error: "Missing password fields" } as const;
  }

  try {
    await authRepo.changePassword(sessionToken, currentPassword, newPassword);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to change password"),
    } as const;
  }
}
