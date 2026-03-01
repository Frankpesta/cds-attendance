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
    const requests = await docRepo.listCorpMemberRequests(sessionToken);
    return NextResponse.json(requests);
  } catch (e) {
    console.error("Corp member requests error:", e);
    return NextResponse.json(
      { error: "Failed to fetch corp member requests" },
      { status: 500 },
    );
  }
}
