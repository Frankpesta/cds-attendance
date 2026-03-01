import { NextRequest, NextResponse } from "next/server";
import * as settingsRepo from "@/lib/repositories/settings";

export async function GET(request: NextRequest) {
  try {
    const batch = request.nextUrl.searchParams.get("batch") as "A" | "B" | "C" | null;
    const stateCode = request.nextUrl.searchParams.get("stateCode") ?? undefined;
    const count = await settingsRepo.getRequiredAttendanceCount({
      batch: batch ?? undefined,
      stateCode,
    });
    return NextResponse.json(count);
  } catch (e) {
    console.error("Required attendance error:", e);
    return NextResponse.json(
      { error: "Failed to fetch required attendance" },
      { status: 500 },
    );
  }
}
