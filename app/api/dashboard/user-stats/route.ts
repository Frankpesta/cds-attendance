import { NextRequest, NextResponse } from "next/server";
import * as dashboardRepo from "@/lib/repositories/dashboard";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }
    const stats = await dashboardRepo.getUserStats(userId);
    return NextResponse.json(stats);
  } catch (e) {
    console.error("User stats error:", e);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 },
    );
  }
}
