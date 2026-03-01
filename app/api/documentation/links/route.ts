import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as docRepo from "@/lib/repositories/documentation";

export async function GET(request: NextRequest) {
  try {
    const c = await cookies();
    const sessionToken = c.get("session_token")?.value || "";
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const type = request.nextUrl.searchParams.get("type") as
      | "corp_member"
      | "employer"
      | "rejected_reposting"
      | "corp_member_request"
      | null;
    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 },
      );
    }
    const links = await docRepo.listLinks(sessionToken, type);
    return NextResponse.json(links);
  } catch (e) {
    console.error("Documentation links error:", e);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 },
    );
  }
}
