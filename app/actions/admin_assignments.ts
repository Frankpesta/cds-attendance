"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as adminAssignmentsRepo from "@/lib/repositories/admin_assignments";

export async function createAdminAssignmentAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const admin_id = formData.get("admin_id") as string;
    const cds_group_id = formData.get("cds_group_id") as string;

    if (!admin_id || !cds_group_id) {
      return { ok: false, error: "Admin and group are required" };
    }

    const result = await adminAssignmentsRepo.createAdminAssignment(
      admin_id,
      cds_group_id,
    );

    return { ok: true, id: result };
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to create assignment"),
    };
  }
}

export async function removeAdminAssignmentAction(assignmentId: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const result = await adminAssignmentsRepo.removeAdminAssignment(assignmentId);

    return { ok: true, id: result };
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to remove assignment"),
    };
  }
}
