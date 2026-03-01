import { NextResponse } from "next/server";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET() {
  try {
    const date = qrRepo.getTodayMeetingDate();
    return NextResponse.json(date);
  } catch (e) {
    console.error("Today meeting date error:", e);
    return NextResponse.json(
      { error: "Failed to get today's meeting date" },
      { status: 500 },
    );
  }
}
