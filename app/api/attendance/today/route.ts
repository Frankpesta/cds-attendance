import { NextResponse } from "next/server";
import * as attendanceRepo from "@/lib/repositories/attendance";

export async function GET() {
  try {
    const attendance = await attendanceRepo.getTodayAttendance();
    return NextResponse.json(attendance);
  } catch (e) {
    console.error("Today attendance error:", e);
    return NextResponse.json(
      { error: "Failed to fetch today's attendance" },
      { status: 500 },
    );
  }
}
