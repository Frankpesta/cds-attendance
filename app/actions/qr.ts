"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractErrorMessage } from "@/lib/utils";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function startQrAction(cdsGroupId: string) {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  if (!cdsGroupId) return { ok: false, error: "CDS group ID is required" } as const;
  try {
    const res = await client.mutation(api.qr.startQrSession, { sessionToken: token, cdsGroupId: cdsGroupId as any });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to start QR") } as const;
  }
}

export async function stopQrAction(cdsGroupId: string) {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  if (!cdsGroupId) return { ok: false, error: "CDS group ID is required" } as const;
  try {
    await client.mutation(api.qr.stopQrSession, { sessionToken: token, cdsGroupId: cdsGroupId as any });
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: extractErrorMessage(e, "Failed to stop QR") } as const;
  }
}


