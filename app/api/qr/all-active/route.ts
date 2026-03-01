import { NextRequest, NextResponse } from "next/server";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET(request: NextRequest) {
  try {
    const meetingDate = request.nextUrl.searchParams.get("meetingDate") ?? undefined;
    const sessions = await qrRepo.getAllActiveQr(meetingDate);
    return NextResponse.json(sessions);
  } catch (e) {
    console.error("All active QR error:", e);
    return NextResponse.json(
      { error: "Failed to fetch active QR sessions" },
      { status: 500 },
    );
  }
}
