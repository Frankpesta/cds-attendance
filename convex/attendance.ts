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

    // Token validation - check if QR code is valid and active
    const qr = await ctx.db
      .query("qr_tokens")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!qr) throw new Error("Invalid QR code.");
    const now = nowMs();
    if (qr.expires_at < now) throw new Error("QR code expired. Please scan the current code.");
    
    // For new tokens, verify the meeting/session associated with this QR code is still active
    // Legacy tokens without meeting_id are not supported in the new system
    if (!qr.meeting_id) {
      throw new Error("This QR code format is no longer supported. Please scan a current QR code.");
    }
    
    const meeting = await ctx.db.get(qr.meeting_id);
    if (!meeting || !meeting.is_active) {
      throw new Error("This QR code session is no longer active.");
    }
    
    // Verify the meeting date matches today
    if (meeting.meeting_date !== today) {
      throw new Error("This QR code is not valid for today.");
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

// Manual attendance marking by super_admin
export const markAttendanceManually = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    meetingDate: v.optional(v.string()), // YYYY-MM-DD format, defaults to today
  },
  handler: async (ctx, { sessionToken, userId, meetingDate }) => {
    // Require super_admin authorization
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) {
      throw new Error("Unauthorized");
    }
    const currentUser = await ctx.db.get(session.user_id);
    if (!currentUser || currentUser.role !== "super_admin") {
      throw new Error("Forbidden: Super admin access required");
    }

    // Get the user to mark attendance for
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "corps_member") {
      throw new Error("Can only mark attendance for corps members");
    }

    if (!user.cds_group_id) {
      throw new Error("User does not have a CDS group assigned");
    }

    const group = await ctx.db.get(user.cds_group_id);
    if (!group) {
      throw new Error("CDS group not found");
    }

    const today = meetingDate || toNigeriaYYYYMMDD(new Date());
    const now = nowMs();

    // Check if already marked for this date
    const existing = await ctx.db
      .query("attendance")
      .filter((q) => q.and(
        q.eq(q.field("user_id"), userId),
        q.eq(q.field("meeting_date"), today)
      ))
      .unique();
    
    if (existing) {
      throw new Error(`Attendance already marked for ${user.name} on ${today}`);
    }

    // Find an active QR token for today, or create a manual one
    let qrTokenId;
    
    // Try to find an active QR token for today
    const activeMeetings = await ctx.db
      .query("meetings")
      .filter((q) => q.and(
        q.eq(q.field("is_active"), true),
        q.eq(q.field("meeting_date"), today)
      ))
      .collect();
    
    if (activeMeetings.length > 0) {
      // Find a QR token for one of the active meetings
      const meeting = activeMeetings[0];
      const qrTokens = await ctx.db
        .query("qr_tokens")
        .filter((q) => q.eq(q.field("meeting_id"), meeting._id))
        .collect();
      
      if (qrTokens.length > 0) {
        qrTokenId = qrTokens[0]._id;
      }
    }

    // If no active QR token found, create a manual one
    if (!qrTokenId) {
      // Create a manual QR token for this attendance record
      const { generateRandomTokenHex } = await import("./utils");
      const manualToken = generateRandomTokenHex(32);
      const qrToken = await ctx.db.insert("qr_tokens", {
        token: manualToken,
        meeting_date: today,
        meeting_id: undefined, // Manual token, not tied to a meeting
        cds_group_id: group._id,
        generated_by_admin_id: currentUser._id,
        generated_at: now,
        expires_at: now + (24 * 60 * 60 * 1000), // 24 hours
        rotation_sequence: 0,
        is_consumed: false,
      });
      qrTokenId = qrToken;
    }

    // Create attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      user_id: userId,
      cds_group_id: group._id,
      meeting_date: today,
      scanned_at: now,
      qr_token_id: qrTokenId,
      status: "present",
    });

    return { attendanceId, meetingDate: today };
  },
});
