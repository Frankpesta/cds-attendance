"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

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
    return { ok: false, error: e?.message || "Failed to start QR" } as const;
  }
}

export async function stopQrAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return { ok: false, error: "Unauthorized" } as const;
  try {
    await client.mutation(api.qr.stopQrSession, { sessionToken: token });
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to stop QR" } as const;
  }
}


