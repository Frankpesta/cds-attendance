"use server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function submitAttendanceAction(formData: FormData) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  
  try {
    const token = formData.get("token") as string;
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    
    if (!token) {
      return { ok: false, error: "Token is required" } as const;
    }
    
    const coords = !isNaN(latitude) && !isNaN(longitude) 
      ? { latitude, longitude, accuracy: 10 } 
      : undefined;
    
    const res = await client.mutation(api.attendance.submitScan, { sessionToken, token, coords });
    return { ok: true, data: res } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to submit attendance" } as const;
  }
}


