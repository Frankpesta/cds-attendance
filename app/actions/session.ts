"use server";
import { cookies } from "next/headers";
import * as authRepo from "@/lib/repositories/auth";

export async function getSessionAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  if (!token) return null;
  try {
    const result = await authRepo.getSession(token);
    if (!result) return null;
    return { session: result.session, user: result.user };
  } catch {
    return null;
  }
}

export async function getSessionTokenAction() {
  const c = await cookies();
  const token = c.get("session_token")?.value || "";
  return token || null;
}
