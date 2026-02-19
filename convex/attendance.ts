import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isWithinMeetingWindow, nowMs, toNigeriaYYYYMMDD, generateRandomTokenHex, generateQrTokenServer } from "./utils";

export const submitScan = mutation({
  args: {
    sessionToken: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { sessionToken, token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("session_token", sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");
    const user = await ctx.db.get(session.user_id);
    if (!user) throw new Error("Unauthorized");

    const todayDate = toNigeriaYYYYMMDD(new Date());

    // Already scanned today? Use user/date index to avoid scanning full attendance table.
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_user_date", (q) => q.eq("user_id", user._id))
      .filter((q) => q.eq(q.field("meeting_date"), todayDate))
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

    // Token validation - support both new (client-generated) and legacy (server-generated) tokens
    const now = nowMs();
    let validToken = false;
    let validMeeting = null;
    
    // First, try to validate as client-generated token (new system)
    const activeMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_date", (q) => q.eq("meeting_date", todayDate))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();
    
    // Optimize: Only check meetings with session_secret (new system)
    // Most meetings will have secrets, so this is efficient
    for (const meeting of activeMeetings) {
      // Skip if no session secret (legacy meeting)
      if (!meeting.session_secret) continue;
      
      const rotationInterval = meeting.rotation_interval_sec || 50;
      
      // Generate expected token using same algorithm as client
      // Note: This is async but we await it - typically only 1-5 active meetings per day
      const expectedToken = await generateQrTokenServer(
        meeting.session_secret,
        now,
        rotationInterval
      );
      
      // Quick check: if current window matches, we're done
      if (token === expectedToken) {
        validToken = true;
        validMeeting = meeting;
        break;
      }
      
      // Only check previous/next windows if current doesn't match (optimization)
      // This reduces computation for most cases
      const prevWindowToken = await generateQrTokenServer(
        meeting.session_secret,
        now - (rotationInterval * 1000),
        rotationInterval
      );
      
      if (token === prevWindowToken) {
        validToken = true;
        validMeeting = meeting;
        break;
      }
      
      const nextWindowToken = await generateQrTokenServer(
        meeting.session_secret,
        now + (rotationInterval * 1000),
        rotationInterval
      );
      
      if (token === nextWindowToken) {
        validToken = true;
        validMeeting = meeting;
        break;
      }
    }
    
    // If not found as client-generated, try legacy token validation
    let legacyQrToken: any = null;
    if (!validToken) {
      const qr = await ctx.db
        .query("qr_tokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      
      if (qr) {
        legacyQrToken = qr;
        if (qr.expires_at < now) {
          throw new Error("QR code expired. Please scan the current code.");
        }
        
        if (!qr.meeting_id) {
          throw new Error("This QR code format is no longer supported. Please scan a current QR code.");
        }
        
        const meeting = await ctx.db.get(qr.meeting_id);
        if (meeting && meeting.is_active && meeting.meeting_date === todayDate) {
          validToken = true;
          validMeeting = meeting;
        }
      }
    }
    
    if (!validToken || !validMeeting) {
      throw new Error("Invalid or expired QR code.");
    }
    
    // Verify the meeting date matches today
    if (validMeeting.meeting_date !== todayDate) {
      throw new Error("This QR code is not valid for today.");
    }
    
    // Store token in qr_tokens for audit (optional, only for new tokens)
    let qrTokenId: any;
    if (validMeeting.session_secret) {
      // New system - create audit record
      qrTokenId = await ctx.db.insert("qr_tokens", {
        token,
        meeting_date: todayDate,
        meeting_id: validMeeting._id,
        generated_by_admin_id: validMeeting.activated_by_admin_id || user._id,
        generated_at: now,
        expires_at: now + ((validMeeting.rotation_interval_sec || 50) * 1000),
        rotation_sequence: 0, // Not used in new system
        is_consumed: true, // Mark as consumed immediately
        cds_group_id: undefined,
      });
    } else {
      // Legacy system - use existing qr token
      if (!legacyQrToken) {
        legacyQrToken = await ctx.db
          .query("qr_tokens")
          .withIndex("by_token", (q) => q.eq("token", token))
          .unique();
      }
      if (!legacyQrToken) {
        throw new Error("QR token not found for legacy session.");
      }
      qrTokenId = legacyQrToken._id;
    }

    const attendanceId = await ctx.db.insert("attendance", {
      user_id: user._id,
      cds_group_id: group._id,
      meeting_date: todayDate,
      scanned_at: now,
      qr_token_id: qrTokenId,
      status: "present",
    });

    return { attendanceId };
  },
});

export const getUserHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 100 }) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user_date", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(limit);
    return attendance.map((record) => ({
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
      .withIndex("by_user_date", (q) => q.eq("user_id", userId))
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

export const getTodayAttendance = query({
  args: {},
  handler: async (ctx) => {
    const today = toNigeriaYYYYMMDD(new Date());
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("meeting_date", today))
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
      .withIndex("by_token", (q) => q.eq("session_token", sessionToken))
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

    // Check if already marked for this date using user/date index
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_user_date", (q) => q.eq("user_id", userId))
      .filter((q) => q.eq(q.field("meeting_date"), today))
      .unique();
    
    if (existing) {
      throw new Error(`Attendance already marked for ${user.name} on ${today}`);
    }

    // Find an active QR token for today, or create a manual one
    let qrTokenId;
    
    // Try to find an active QR token for today
    const activeMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_date", (q) => q.eq("meeting_date", today))
      .filter((q) => q.eq(q.field("is_active"), true))
      .take(1);
    
    if (activeMeetings.length > 0) {
      // Find a QR token for one of the active meetings
      const meeting = activeMeetings[0];
      const qrTokens = await ctx.db
        .query("qr_tokens")
        .withIndex("by_meeting_id", (q) => q.eq("meeting_id", meeting._id))
        .order("desc")
        .take(1);
      
      if (qrTokens.length > 0) {
        qrTokenId = qrTokens[0]._id;
      }
    }

    // If no active QR token found, create a manual one (omit meeting_id for manual tokens)
    if (!qrTokenId) {
      const manualToken = generateRandomTokenHex(32);
      const qrToken = await ctx.db.insert("qr_tokens", {
        token: manualToken,
        meeting_date: today,
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
