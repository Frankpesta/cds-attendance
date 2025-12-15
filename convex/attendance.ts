import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isWithinMeetingWindow, nowMs, toNigeriaYYYYMMDD } from "./utils";

export const submitScan = mutation({
  args: {
    sessionToken: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { sessionToken, token }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");
    const user = await ctx.db.get(session.user_id);
    if (!user) throw new Error("Unauthorized");

    const today = toNigeriaYYYYMMDD(new Date());

    // Already scanned today?
    const existing = await ctx.db
      .query("attendance")
      .filter((q) => q.and(q.eq(q.field("user_id"), user._id), q.eq(q.field("meeting_date"), today)))
      .unique();
    if (existing) {
      throw new Error(`You already marked attendance today.`);
    }

    // Validate group meets today and time window
    const group = user.cds_group_id ? await ctx.db.get(user.cds_group_id) : null;
    if (!group) throw new Error("No CDS group assigned.");
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });
    if (!group.meeting_days.includes(weekday)) {
      throw new Error("Your CDS group doesn't meet today.");
    }
    if (!isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 15, 15)) {
      throw new Error("Scanning is only available during meeting hours.");
    }

    // Token validation - must match user's CDS group
    const qr = await ctx.db
      .query("qr_tokens")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!qr) throw new Error("Invalid QR code.");
    const now = nowMs();
    if (qr.expires_at < now) throw new Error("QR code expired. Please scan the current code.");
    
    // Verify QR token is for the user's CDS group
    // For backward compatibility: if qr.cds_group_id is not set (old tokens), allow it
    // Otherwise, verify it matches the user's group
    if (qr.cds_group_id && qr.cds_group_id !== group._id) {
      throw new Error("This QR code is not for your CDS group. Please scan the correct QR code for your group.");
    }

    const attendanceId = await ctx.db.insert("attendance", {
      user_id: user._id,
      cds_group_id: group._id,
      meeting_date: today,
      scanned_at: now,
      qr_token_id: qr._id,
      status: "present",
    });

    return { attendanceId };
  },
});

export const getUserHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const attendance = await ctx.db.query("attendance")
      .filter(q => q.eq(q.field("user_id"), userId))
      .order("desc")
      .collect();
    
    return attendance.map(record => ({
      _id: record._id,
      user_id: record.user_id,
      cds_group_id: record.cds_group_id,
      qr_token_id: record.qr_token_id,
      status: record.status,
      timestamp: record.scanned_at,
      meeting_date: record.meeting_date,
    }));
  },
});

export const getUserTodayAttendance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const today = toNigeriaYYYYMMDD(new Date());
    const attendance = await ctx.db
      .query("attendance")
      .filter((q) => q.and(
        q.eq(q.field("user_id"), userId),
        q.eq(q.field("meeting_date"), today)
      ))
      .collect();
    
    return attendance.map(record => ({
      _id: record._id,
      user_id: record.user_id,
      cds_group_id: record.cds_group_id,
      qr_token_id: record.qr_token_id,
      status: record.status,
      scanned_at: record.scanned_at,
      meeting_date: record.meeting_date,
    }));
  },
});

export const getTodayAttendance = query({
  args: {},
  handler: async (ctx) => {
    const today = toNigeriaYYYYMMDD(new Date());
    const attendance = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("meeting_date"), today))
      .collect();
    
    return attendance.map(record => ({
      _id: record._id,
      user_id: record.user_id,
      cds_group_id: record.cds_group_id,
      qr_token_id: record.qr_token_id,
      status: record.status,
      scanned_at: record.scanned_at,
      meeting_date: record.meeting_date,
    }));
  },
});

