import { NextResponse } from "next/server";
import * as adminAssignmentsRepo from "@/lib/repositories/admin_assignments";

export async function GET() {
  try {
    const assignments = await adminAssignmentsRepo.listAdminAssignments();
    return NextResponse.json(assignments);
  } catch (e) {
    console.error("Admin assignments error:", e);
    return NextResponse.json(
      { error: "Failed to fetch admin assignments" },
      { status: 500 },
    );
  }
}
