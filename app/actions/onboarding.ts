"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function onboardCorpsMemberAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const ppa = String(formData.get("ppa") || "").trim();
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();
  const stateCode = String(formData.get("stateCode") || "").trim();

  if (!name || !email || !address || !ppa || !cds_group_id || !stateCode) {
    return { ok: false, error: "All fields are required" } as const;
  }

  try {
    const res = await client.mutation(api.onboarding.onboardCorpsMember, {
      actorSessionToken: sessionToken,
      name,
      email,
      address,
      ppa,
      cds_group_id: cds_group_id as any,
      stateCode,
      batchCode: "24A",
      statePrefix: "AK",
    });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to onboard corps member" } as const;
  }
}
