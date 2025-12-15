"use server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractErrorMessage } from "@/lib/utils";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function requestPasswordResetAction(stateCode: string, email: string) {
  try {
    const result = await client.mutation(api.auth.requestPasswordReset, { stateCode, email });
    
    if (!result.success) {
      return { ok: false, error: result.error || "Invalid state code or email combination" };
    }

    if (result.token) {
      // Redirect to reset page with token
      return { ok: true, token: result.token };
    }

    return { ok: false, error: "Failed to generate reset token" };
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to request password reset") };
  }
}

export async function resetPasswordAction(token: string, newPassword: string) {
  try {
    await client.mutation(api.auth.resetPassword, { token, newPassword });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to reset password") };
  }
}

export async function validateResetTokenAction(token: string) {
  try {
    const result = await client.query(api.auth.validateResetToken, { token });
    return result;
  } catch (e: any) {
    return { valid: false };
  }
}
