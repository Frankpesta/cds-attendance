"use server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function createAdminAssignmentAction(formData: FormData) {
  try {
    const admin_id = formData.get("admin_id") as string;
    const cds_group_id = formData.get("cds_group_id") as string;

    if (!admin_id || !cds_group_id) {
      return { ok: false, error: "Admin and group are required" };
    }

    const result = await client.mutation(api.admin_assignments.create, {
      admin_id: admin_id as any,
      cds_group_id: cds_group_id as any,
    });

    return { ok: true, id: result };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to create assignment" };
  }
}

export async function removeAdminAssignmentAction(assignmentId: string) {
  try {
    const result = await client.mutation(api.admin_assignments.remove, {
      id: assignmentId as any,
    });

    return { ok: true, id: result };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to remove assignment" };
  }
}
