import { NextRequest, NextResponse } from "next/server";
import * as dashboardRepo from "@/lib/repositories/dashboard";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5", 10);
    const groups = await dashboardRepo.getTopGroups(limit);
    return NextResponse.json(groups);
  } catch (e) {
    console.error("Top groups error:", e);
    return NextResponse.json(
      { error: "Failed to fetch top groups" },
      { status: 500 },
    );
  }
}
