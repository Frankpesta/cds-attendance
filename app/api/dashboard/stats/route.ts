import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as dashboardRepo from "@/lib/repositories/dashboard";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const stats = await dashboardRepo.getStats(userId ?? undefined);
    return NextResponse.json(stats);
  } catch (e) {
    console.error("Dashboard stats error:", e);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
