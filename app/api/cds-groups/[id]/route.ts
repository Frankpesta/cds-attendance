import { NextRequest, NextResponse } from "next/server";
import * as cdsGroupsRepo from "@/lib/repositories/cds_groups";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const group = await cdsGroupsRepo.getCdsGroup(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (e) {
    console.error("CDS group get error:", e);
    return NextResponse.json(
      { error: "Failed to fetch CDS group" },
      { status: 500 },
    );
  }
}
