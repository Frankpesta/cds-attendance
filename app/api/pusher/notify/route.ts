import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const { channel, event, data } = await request.json();

    if (!channel || !event || !data) {
      console.error("Pusher: Missing required fields", { channel, event, data: !!data });
      return NextResponse.json(
        { error: "Channel, event, and data are required" },
        { status: 400 }
      );
    }

    console.log("Pusher: Triggering event", { channel, event, data });
    
    const result = await pusher.trigger(channel, event, data);
    
    console.log("Pusher: Event triggered successfully", result);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Pusher notification error:", error);
    console.error("Pusher error details:", {
      message: error.message,
      stack: error.stack,
      appId: process.env.PUSHER_APP_ID ? "set" : "missing",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY ? "set" : "missing",
      secret: process.env.PUSHER_SECRET ? "set" : "missing",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "mt1",
    });
    return NextResponse.json(
      { error: "Failed to send notification", details: error.message },
      { status: 500 }
    );
  }
}
