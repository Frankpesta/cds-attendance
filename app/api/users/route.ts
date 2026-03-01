import { NextResponse } from "next/server";
import * as usersRepo from "@/lib/repositories/users";

export async function GET() {
  try {
    const users = await usersRepo.listUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error("Users list error:", e);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
