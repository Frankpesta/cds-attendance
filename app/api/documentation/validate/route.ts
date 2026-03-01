import { NextRequest, NextResponse } from "next/server";
import * as docRepo from "@/lib/repositories/documentation";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const type = request.nextUrl.searchParams.get("type") as
      | "corp_member"
      | "employer"
      | "rejected_reposting"
      | "corp_member_request"
      | null;
    if (!token || !type) {
      return NextResponse.json(
        { error: "token and type are required" },
        { status: 400 },
      );
    }
    const result = await docRepo.validateLink(token, type);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Documentation validate error:", e);
    return NextResponse.json(
      { error: "Failed to validate link" },
      { status: 500 },
    );
  }
}
