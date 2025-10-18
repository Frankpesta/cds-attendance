"use server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function seedSuperAdminAction(formData: FormData) {
  const secret = String(formData.get("secret") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const stateCode = String(formData.get("stateCode") || "").trim();
  if (!secret || !name || !email || !password || !stateCode) {
    return { ok: false, error: "All fields required" } as const;
  }
  try {
    const res = await client.action(api.seed.seedSuperAdmin, {
      secret,
      name,
      email,
      password,
      stateCode,
    });
    if (!res.ok) return { ok: false, error: res.error || "Seed failed" } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Seed failed" } as const;
  }
}


