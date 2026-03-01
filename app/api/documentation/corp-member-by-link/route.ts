import { NextRequest, NextResponse } from "next/server";
import * as docRepo from "@/lib/repositories/documentation";

export async function GET(request: NextRequest) {
  try {
    const linkToken = request.nextUrl.searchParams.get("linkToken");
    if (!linkToken) {
      return NextResponse.json(
        { error: "linkToken is required" },
        { status: 400 },
      );
    }
    const record = await docRepo.getCorpMemberByLinkToken(linkToken);
    return NextResponse.json(record);
  } catch (e) {
    console.error("Corp member by link error:", e);
    return NextResponse.json(
      { error: "Failed to fetch corp member" },
      { status: 500 },
    );
  }
}
