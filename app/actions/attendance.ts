"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as attendanceRepo from "@/lib/repositories/attendance";

export async function submitAttendanceAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;

  try {
    const token = formData.get("token") as string;
    if (!token) {
      return { ok: false, error: "Token is required" } as const;
    }
    const res = await attendanceRepo.submitScan(sessionToken, token);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to submit attendance"),
    } as const;
  }
}

export async function markAttendanceManuallyAction(
  userId: string,
  meetingDate?: string,
) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    const res = await attendanceRepo.markAttendanceManually(
      sessionToken,
      userId,
      meetingDate,
    );
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to mark attendance"),
    } as const;
  }
}

export async function listManualAttendanceTodayAction() {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false as const, error: "Unauthorized" };
  }

  try {
    const data = await attendanceRepo.listManualAttendanceForToday(sessionToken);
    return { ok: true as const, data };
  } catch (e: unknown) {
    return {
      ok: false as const,
      error: extractErrorMessage(e, "Failed to load manual attendance"),
    };
  }
}

export async function unmarkManualAttendanceAction(attendanceId: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false as const, error: "Unauthorized" };
  }

  try {
    const data = await attendanceRepo.unmarkManualAttendance(
      sessionToken,
      attendanceId,
    );
    return { ok: true as const, data };
  } catch (e: unknown) {
    return {
      ok: false as const,
      error: extractErrorMessage(e, "Failed to remove attendance"),
    };
  }
}
