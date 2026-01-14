import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const { channel, event, data } = await request.json();

    if (!channel || !event || !data) {
      return NextResponse.json(
        { error: "Channel, event, and data are required" },
        { status: 400 }
      );
    }

    await pusher.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Pusher notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
