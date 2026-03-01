import { NextResponse } from "next/server";
import * as settingsRepo from "@/lib/repositories/settings";

export async function GET() {
  try {
    const settings = await settingsRepo.getBatchAttendanceSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Batch attendance settings error:", e);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}
