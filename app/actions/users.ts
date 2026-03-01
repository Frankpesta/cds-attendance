"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as usersRepo from "@/lib/repositories/users";

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
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();

  if (!name || !email || !state_code || !role || !password) {
    return {
      ok: false,
      error: "Name, email, state code, role, and password are required",
    } as const;
  }

  try {
    const res = await usersRepo.createUser({
      name,
      email,
      state_code,
      role: role as "super_admin" | "admin" | "corps_member",
      password,
      cds_group_id: cds_group_id || undefined,
    });
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to create user"),
    } as const;
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
  const cds_group_id = String(formData.get("cds_group_id") || "").trim();

  if (!name || !email || !state_code || !role) {
    return {
      ok: false,
      error: "Name, email, state code, and role are required",
    } as const;
  }

  try {
    await usersRepo.updateUser(id, {
      name,
      email,
      state_code,
      role: role as "super_admin" | "admin" | "corps_member",
      cds_group_id: cds_group_id || undefined,
    });
    return { ok: true, data: id } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update user"),
    } as const;
  }
}

export async function deleteUserAction(id: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    const res = await usersRepo.deleteUser(sessionToken, id);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete user"),
    } as const;
  }
}

export async function changeUserPasswordAction(id: string, newPassword: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    await usersRepo.changeUserPassword(id, newPassword);
    return { ok: true, data: id } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to change password"),
    } as const;
  }
}

export async function batchDeleteUsersAction(userIds: string[]) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  if (userIds.length === 0) {
    return { ok: false, error: "No users selected" } as const;
  }

  try {
    const res = await usersRepo.batchDeleteUsers(sessionToken, userIds);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete users"),
    } as const;
  }
}

export async function unblockUserAction(
  userId: string,
  allowAnyDevice: boolean = false,
) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    await usersRepo.unblockUser(sessionToken, userId, allowAnyDevice);
    return { ok: true, data: { success: true } } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to unblock user"),
    } as const;
  }
}
