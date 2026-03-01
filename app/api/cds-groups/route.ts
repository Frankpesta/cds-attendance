import { NextResponse } from "next/server";
import * as cdsGroupsRepo from "@/lib/repositories/cds_groups";

export async function GET() {
  try {
    const groups = await cdsGroupsRepo.listCdsGroups();
    return NextResponse.json(groups);
  } catch (e) {
    console.error("CDS groups list error:", e);
    return NextResponse.json(
      { error: "Failed to fetch CDS groups" },
      { status: 500 },
    );
  }
}
