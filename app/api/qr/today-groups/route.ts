import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as qrRepo from "@/lib/repositories/qr";

export async function GET() {
  try {
    const c = await cookies();
    const sessionToken = c.get("session_token")?.value || "";
    const groups = await qrRepo.getTodayGroups(sessionToken || undefined);
    return NextResponse.json(groups);
  } catch (e) {
    console.error("Today groups error:", e);
    return NextResponse.json(
      { error: "Failed to fetch today's groups" },
      { status: 500 },
    );
  }
}
