import { NextRequest, NextResponse } from "next/server";
import * as dashboardRepo from "@/lib/repositories/dashboard";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const activities = await dashboardRepo.getRecentActivity(limit, userId);
    return NextResponse.json(activities);
  } catch (e) {
    console.error("Recent activity error:", e);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 },
    );
  }
}
