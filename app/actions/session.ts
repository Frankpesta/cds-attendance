"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function getSessionAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return null;
  try {
    const sess = await client.query(api.auth.getSession, { sessionToken: token });
    return sess;
  } catch {
    return null;
  }
}

export async function getSessionTokenAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  return token || null;
}


