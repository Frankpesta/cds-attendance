import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function POST(request: NextRequest) {
  try {
    const { socket_id, channel_name } = await request.json();

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: "Socket ID and channel name are required" },
        { status: 400 }
      );
    }

    // Verify user is admin
    const c = await cookies();
    const sessionToken = c.get("session_token")?.value || "";
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await client.query(api.auth.getSession, { sessionToken });
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // For private channels, we would sign the channel here
    // For now, we'll use public channels for simplicity
    // If you need private channels, use Pusher's auth signing
    
    return NextResponse.json({});
  } catch (error: any) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
