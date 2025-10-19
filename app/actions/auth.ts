"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function loginAction(formData: FormData) {
  const stateCode = String(formData.get("stateCode") || "").trim();
  const password = String(formData.get("password") || "");
  const clientIp = String(formData.get("clientIp") || "");
  if (!stateCode || !password) {
    return { ok: false, error: "Missing credentials" } as const;
  }
  try {
    const res = await client.mutation(api.auth.login, { stateCode, password, clientIp });
    const c = await cookies();
    c.set("session_token", res.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return { ok: true, mustChange: res.user.must_change_password } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Login failed" } as const;
  }
}

export async function logoutAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (token) {
    try {
      await client.mutation(api.auth.logout, { sessionToken: token });
    } catch (e) {
      // Ignore errors on logout
    }
  }
  c.delete("session_token");
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
    await client.mutation(api.auth.changePassword, { 
      sessionToken, 
      currentPassword, 
      newPassword 
    });
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to change password" } as const;
  }
}

export async function unbanUserAction(userId: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }
  
  try {
    await client.mutation(api.auth.unbanUser, { sessionToken, userId: userId as any });
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to unban user" } as const;
  }
}