import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as docRepo from "@/lib/repositories/documentation";

export async function GET() {
  try {
    const c = await cookies();
    const sessionToken = c.get("session_token")?.value || "";
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const records = await docRepo.listRejectedReposting(sessionToken);
    return NextResponse.json(records);
  } catch (e) {
    console.error("Rejected reposting error:", e);
    return NextResponse.json(
      { error: "Failed to fetch rejected reposting" },
      { status: 500 },
    );
  }
}
