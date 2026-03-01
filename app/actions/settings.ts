"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as settingsRepo from "@/lib/repositories/settings";

export async function setBatchAttendanceRequirementsAction(args: {
  default: number;
  batchA?: number;
  batchB?: number;
  batchC?: number;
}) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await settingsRepo.setBatchAttendanceRequirements(sessionToken, args);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update settings"),
    } as const;
  }
}
