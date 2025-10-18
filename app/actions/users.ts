"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function createUserAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const state_code = String(formData.get("state_code") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const ppa = String(formData.get("ppa") || "").trim();
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();

  if (!name || !email || !state_code || !role || !password) {
    return { ok: false, error: "Name, email, state code, role, and password are required" } as const;
  }

  try {
    const res = await client.mutation(api.users.create, {
      name,
      email,
      state_code,
      role: role as any,
      password,
      address: address || undefined,
      ppa: ppa || undefined,
      cds_group_id: cds_group_id || undefined,
    });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to create user" } as const;
  }
}

export async function updateUserAction(id: string, formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const state_code = String(formData.get("state_code") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const ppa = String(formData.get("ppa") || "").trim();
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();

  if (!name || !email || !state_code || !role) {
    return { ok: false, error: "Name, email, state code, and role are required" } as const;
  }

  try {
    const res = await client.mutation(api.users.update, {
      id: id as any,
      name,
      email,
      state_code,
      role: role as any,
      address: address || undefined,
      ppa: ppa || undefined,
      cds_group_id: cds_group_id || undefined,
    });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to update user" } as const;
  }
}

export async function deleteUserAction(id: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    const res = await client.mutation(api.users.deleteUser, {
      id: id as any,
    });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to delete user" } as const;
  }
}

export async function changeUserPasswordAction(id: string, newPassword: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    const res = await client.mutation(api.users.changePassword, {
      id: id as any,
      newPassword,
    });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to change password" } as const;
  }
}

