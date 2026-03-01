"use server";
import { extractErrorMessage } from "@/lib/utils";
import * as authRepo from "@/lib/repositories/auth";

export async function requestPasswordResetAction(stateCode: string, email: string) {
  try {
    const result = await authRepo.requestPasswordReset(stateCode, email);

    if (!result.success) {
      return {
        ok: false,
        error: result.error || "Invalid state code or email combination",
      };
    }

    if (result.token) {
      return { ok: true, token: result.token };
    }

    return { ok: false, error: "Failed to generate reset token" };
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to request password reset"),
    };
  }
}

export async function resetPasswordAction(token: string, newPassword: string) {
  try {
    await authRepo.resetPassword(token, newPassword);
    return { ok: true };
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to reset password"),
    };
  }
}

export async function validateResetTokenAction(token: string) {
  try {
    const result = await authRepo.validateResetToken(token);
    return result;
  } catch {
    return { valid: false };
  }
}
