import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET() {
  try {
    const c = await cookies();
    const sessionToken = c.get("session_token")?.value || "";
    if (!sessionToken) {
      return NextResponse.json([]);
    }
    const sessions = await qrRepo.getMyActiveSessions(sessionToken);
    return NextResponse.json(sessions);
  } catch (e) {
    console.error("My active sessions error:", e);
    return NextResponse.json(
      { error: "Failed to fetch my active sessions" },
      { status: 500 },
    );
  }
}
