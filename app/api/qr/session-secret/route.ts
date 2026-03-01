import { NextRequest, NextResponse } from "next/server";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET(request: NextRequest) {
  try {
    const meetingId = request.nextUrl.searchParams.get("meetingId");
    if (!meetingId) {
      return NextResponse.json(
        { error: "meetingId is required" },
        { status: 400 },
      );
    }
    const secret = await qrRepo.getSessionSecret(meetingId);
    return NextResponse.json(secret);
  } catch (e) {
    console.error("Session secret error:", e);
    return NextResponse.json(
      { error: "Failed to get session secret" },
      { status: 500 },
    );
  }
}
