import { NextRequest, NextResponse } from "next/server";
import * as usersRepo from "@/lib/repositories/users";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await usersRepo.getUser(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (e) {
    console.error("User get error:", e);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}
