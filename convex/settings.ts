import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nowMs } from "./utils";

async function requireSuperAdmin(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .filter((q: any) => q.eq(q.field("session_token"), sessionToken))
    .unique();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const user = await ctx.db.get(session.user_id);
  if (!user || user.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return { session, user };
}

export const getRequiredAttendanceCount = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "required_attendance_per_month"))
      .first();
    // Default to 3 if not set
    return setting ? parseInt(setting.value, 10) : 3;
  },
});

export const setRequiredAttendanceCount = mutation({
  args: {
    sessionToken: v.string(),
    count: v.number(),
  },
  handler: async (ctx, { sessionToken, count }) => {
    const { user } = await requireSuperAdmin(ctx, sessionToken);
    
    if (count < 1) {
      throw new Error("Required attendance count must be at least 1");
    }
    
    const now = nowMs();
    const existing = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "required_attendance_per_month"))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: count.toString(),
        updated_by: user._id,
        updated_at: now,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "required_attendance_per_month",
        value: count.toString(),
        updated_by: user._id,
        updated_at: now,
      });
    }
    
    return { success: true, count };
  },
});

