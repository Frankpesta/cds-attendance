"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractErrorMessage } from "@/lib/utils";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function startQrAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await client.mutation(api.qr.startQrSession, { sessionToken: token });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to start QR") } as const;
  }
}

export async function stopQrAction(meetingId: string) {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  if (!meetingId) return { ok: false, error: "Meeting ID is required" } as const;
  try {
    await client.mutation(api.qr.stopQrSession, { sessionToken: token, meetingId: meetingId as any });
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to stop QR") } as const;
  }
}


