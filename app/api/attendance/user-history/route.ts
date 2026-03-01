import { NextRequest, NextResponse } from "next/server";
import * as attendanceRepo from "@/lib/repositories/attendance";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100", 10);
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }
    const history = await attendanceRepo.getUserHistory(userId, limit);
    return NextResponse.json(history);
  } catch (e) {
    console.error("User attendance history error:", e);
    return NextResponse.json(
      { error: "Failed to fetch user attendance history" },
      { status: 500 },
    );
  }
}
