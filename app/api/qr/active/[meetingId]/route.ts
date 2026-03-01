import { NextRequest, NextResponse } from "next/server";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const { meetingId } = await params;
    const active = await qrRepo.getActiveQr(meetingId);
    if (!active) {
      return NextResponse.json(null);
    }
    return NextResponse.json(active);
  } catch (e) {
    console.error("Active QR error:", e);
    return NextResponse.json(
      { error: "Failed to fetch active QR" },
      { status: 500 },
    );
  }
}
