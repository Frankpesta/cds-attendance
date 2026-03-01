import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const deleted = await prisma.session.deleteMany({
      where: { expires_at: { lt: BigInt(now) } },
    });
    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Session cleanup error:", e);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 },
    );
  }
}
