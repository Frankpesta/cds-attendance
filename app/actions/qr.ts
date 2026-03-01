"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as qrRepo from "@/lib/repositories/qr";

export async function startQrAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await qrRepo.startQrSession(token);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to start QR"),
    } as const;
  }
}

export async function stopQrAction(meetingId: string) {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  if (!meetingId) return { ok: false, error: "Meeting ID is required" } as const;
  try {
    await qrRepo.stopQrSession(token, meetingId);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to stop QR"),
    } as const;
  }
}
