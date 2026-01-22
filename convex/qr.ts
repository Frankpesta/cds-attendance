import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import {
  generateQrToken,
  generateRandomTokenHex,
  isWithinMeetingWindow,
  nowMs,
  toNigeriaYYYYMMDD,
} from "./utils";

const DEFAULT_ROTATION_SEC = Number(process.env.QR_ROTATION_INTERVAL || 45);
const EXPIRY_BUFFER_SEC = Number(process.env.QR_EXPIRY_BUFFER || 5);

// Determine groups meeting today for an admin (or all, for super admin)
// Admins can see all groups meeting today, not just their assigned ones
export const getTodayGroups = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    // If no session token provided, return empty result
    if (!sessionToken) {
      return { groups: [], meetingToday: [] };
    }
    
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return { groups: [], meetingToday: [] };
    const user = await ctx.db.get(session.user_id);
    if (!user) return { groups: [], meetingToday: [] };

    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });

    const groups = await ctx.db.query("cds_groups").collect();
    const meetingToday = groups.filter((g) => g.meeting_days.includes(weekday));

    // Super admins and regular admins can see all groups meeting today
    if (user.role === "super_admin" || user.role === "admin") {
      return meetingToday;
    }

    // Corps members see nothing (they don't manage QR sessions)
    return [];
  },
});

// Get groups meeting today with their active session status and managing admin
export const getTodayGroupsWithSessions = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) {
      return [];
    }
    
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return [];
    const user = await ctx.db.get(session.user_id);
    if (!user) return [];

    // Only admins can see this
    if (user.role !== "super_admin" && user.role !== "admin") {
      return [];
    }

    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });
    const today = toNigeriaYYYYMMDD(new Date());

    const groups = await ctx.db.query("cds_groups").collect();
    const meetingToday = groups.filter((g) => g.meeting_days.includes(weekday));

    // Get all active meetings for today
    const activeMeetings = await ctx.db
      .query("meetings")
      .filter((q) => q.and(
        q.eq(q.field("meeting_date"), today),
        q.eq(q.field("is_active"), true)
      ))
      .collect();

    // Create a map of group ID to active meeting
    const meetingMap = new Map();
    for (const meeting of activeMeetings) {
      if (meeting.cds_group_id) {
        meetingMap.set(meeting.cds_group_id, meeting);
      } else if (meeting.cds_group_ids && meeting.cds_group_ids.length > 0) {
        // Legacy format - use first group
        meetingMap.set(meeting.cds_group_ids[0], meeting);
      }
    }

    // Return groups with session status
    return await Promise.all(
      meetingToday.map(async (group) => {
        const meeting = meetingMap.get(group._id);
        let managingAdmin = null;
        if (meeting?.activated_by_admin_id) {
          const admin = await ctx.db.get(meeting.activated_by_admin_id);
          // Type guard: ensure admin is a user record with name property
          if (admin && "name" in admin) {
            managingAdmin = { id: admin._id, name: admin.name };
          }
        }

        return {
          _id: group._id,
          name: group.name,
          meeting_time: group.meeting_time,
          meeting_duration: group.meeting_duration,
          venue_name: group.venue_name,
          hasActiveSession: !!meeting,
          managingAdmin: managingAdmin,
        };
      })
    );
  },
});

export const startQrSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");
    const admin = await ctx.db.get(session.user_id);
    if (!admin) throw new Error("Unauthorized");

    // Verify user is an admin (super_admin or admin)
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      throw new Error("Only admins can start QR sessions.");
    }

    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });
    const today = toNigeriaYYYYMMDD(new Date());

    // Check that at least one CDS group meets today and is within meeting window
    const allGroups = await ctx.db.query("cds_groups").collect();
    const groupsMeetingToday = allGroups.filter((g) => g.meeting_days.includes(weekday));
    
    if (groupsMeetingToday.length === 0) {
      throw new Error("No CDS groups are scheduled to meet today.");
    }

    // Check if at least one group is within its meeting time window
    const now = new Date();
    const withinWindowGroups = groupsMeetingToday.filter((group) =>
      isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 30, 0, now)
    );

    if (withinWindowGroups.length === 0) {
      throw new Error("No CDS groups are currently within their meeting time window.");
    }

    // Generate unique session ID
    const sessionId = generateRandomTokenHex(16);
    
    // Generate session secret for client-side token generation (32-byte hex = 64 chars)
    const sessionSecret = generateRandomTokenHex(32);
    const rotationInterval = DEFAULT_ROTATION_SEC;

    // Create new independent session (multiple admins can each create their own)
    const meetingId = await ctx.db.insert("meetings", {
      meeting_date: today,
      session_id: sessionId,
      is_active: true,
      activated_by_admin_id: admin._id,
      activated_at: nowMs(),
      deactivated_at: undefined,
      session_secret: sessionSecret,
      rotation_interval_sec: rotationInterval,
      token_algorithm: "hmac-sha256",
      // Legacy fields kept undefined for new sessions
      cds_group_id: undefined,
      cds_group_ids: undefined,
    });

    // NO token generation - clients will generate tokens locally
    // NO scheduler - clients will rotate tokens locally
    
    return { meetingId, sessionId };
  },
});

// DEPRECATED: This mutation is no longer used for new sessions
// Kept for backward compatibility with legacy sessions that don't have session_secret
// New sessions use client-side token generation
export const rotate = mutation({
  args: { meetingId: v.id("meetings"), nextSequence: v.number(), adminId: v.id("users") },
  handler: async (ctx, { meetingId, nextSequence, adminId }) => {
    const meeting = await ctx.db.get(meetingId);
    
    if (!meeting || !meeting.is_active) return false;
    
    // If this is a new session with session_secret, don't rotate (clients handle it)
    if (meeting.session_secret) {
      return false; // New sessions don't use server-side rotation
    }

    const today = toNigeriaYYYYMMDD(new Date());
    
    // Check that at least one group is still within meeting window
    // Since sessions are independent and not tied to a specific group,
    // we check if any group meeting today is within its window
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });
    const allGroups = await ctx.db.query("cds_groups").collect();
    const groupsMeetingToday = allGroups.filter((g) => g.meeting_days.includes(weekday));
    
    const now = new Date();
    const withinWindowGroups = groupsMeetingToday.filter((group) =>
      isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 0, 0, now)
    );

    if (withinWindowGroups.length === 0) {
      // No groups are within window anymore, stop this session
      await ctx.db.patch(meeting._id, { is_active: false, deactivated_at: nowMs() });
      return false;
    }

    const token = generateQrToken(32);
    const generatedAt = nowMs();
    const expiresAt = generatedAt + (DEFAULT_ROTATION_SEC + EXPIRY_BUFFER_SEC) * 1000;
    await ctx.db.insert("qr_tokens", {
      token,
      meeting_date: today,
      meeting_id: meetingId,
      generated_by_admin_id: adminId,
      generated_at: generatedAt,
      expires_at: expiresAt,
      rotation_sequence: nextSequence,
      is_consumed: false,
      // Legacy field kept undefined
      cds_group_id: undefined,
    });

    // Schedule next rotation for this session
    await ctx.scheduler.runAfter(DEFAULT_ROTATION_SEC * 1000, api.qr.rotate, {
      meetingId,
      nextSequence: nextSequence + 1,
      adminId,
    });

    return true;
  },
});

export const stopQrSession = mutation({
  args: { sessionToken: v.string(), meetingId: v.id("meetings") },
  handler: async (ctx, { sessionToken, meetingId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");
    
    // Verify the meeting exists and is owned by this admin (optional check for security)
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) return false;
    
    // Only allow stopping if it's the admin who started it (or super admin)
    const user = await ctx.db.get(session.user_id);
    if (user && user.role !== "super_admin" && meeting.activated_by_admin_id !== session.user_id) {
      throw new Error("You can only stop sessions you created.");
    }
    
    await ctx.db.patch(meetingId, { is_active: false, deactivated_at: nowMs() });
    return true;
  },
});

// Get session secret for client-side token generation
export const getSessionSecret = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }) => {
    const meeting = await ctx.db.get(meetingId);
    
    if (!meeting || !meeting.is_active) return null;
    
    // Verify user is admin (this should be checked via session token in middleware)
    // For now, we'll return the secret - in production, add session token validation
    
    if (!meeting.session_secret) {
      // Legacy session without secret - return null
      return null;
    }
    
    return {
      secret: meeting.session_secret,
      rotationInterval: meeting.rotation_interval_sec || DEFAULT_ROTATION_SEC,
      meetingDate: meeting.meeting_date,
      isActive: meeting.is_active,
    };
  },
});

// Legacy query - kept for backward compatibility but returns minimal data
// Clients should use getSessionSecret and generate tokens locally
export const getActiveQr = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }) => {
    const meeting = await ctx.db.get(meetingId);
    
    if (!meeting || !meeting.is_active) return null;
    
    // Count total attendance for today
    const today = meeting.meeting_date;
    const attendanceCount = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("meeting_date", today))
      .collect();
    
    // Get admin who created this session
    let adminName = "Unknown";
    if (meeting.activated_by_admin_id) {
      const admin = await ctx.db.get(meeting.activated_by_admin_id);
      if (admin && "name" in admin) {
        adminName = admin.name;
      }
    }
    
    // Return minimal data - token should be generated client-side
    return { 
      token: null, // Clients generate tokens locally
      rotation: 0, // Clients track rotation locally
      expiresAt: 0, // Not applicable for client-side generation
      attendanceCount: attendanceCount.length,
      sessionId: meeting.session_id,
      meetingId: meeting._id,
      adminName: adminName
    };
  },
});

// Get all active QR sessions for a date (for admin dashboard)
export const getAllActiveQr = query({
  args: { meetingDate: v.string() },
  handler: async (ctx, { meetingDate }) => {
    const meetings = await ctx.db
      .query("meetings")
      .filter((q) => q.and(
        q.eq(q.field("meeting_date"), meetingDate),
        q.eq(q.field("is_active"), true)
      ))
      .collect();
    
    // Count total attendance for today (shared across all sessions)
    const attendanceCount = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("meeting_date", meetingDate))
      .collect();
    
    const results = await Promise.all(
      meetings.map(async (meeting) => {
        // Get admin who created this session
        let adminName = "Unknown";
        if (meeting.activated_by_admin_id) {
          const admin = await ctx.db.get(meeting.activated_by_admin_id);
          if (admin && "name" in admin) {
            adminName = admin.name;
          }
        }
        
        // For new sessions (with session_secret), tokens are generated client-side
        if (meeting.session_secret) {
          return {
            meetingId: meeting._id,
            sessionId: meeting.session_id || null,
            token: null, // Generated client-side
            rotation: 0, // Tracked client-side
            expiresAt: 0, // Not applicable
            attendanceCount: attendanceCount.length,
            adminName: adminName,
            activatedAt: meeting.activated_at,
            hasSecret: true, // Indicates new system
          };
        }
        
        // Legacy sessions - get tokens from database
        const tokens = await ctx.db
          .query("qr_tokens")
          .withIndex("by_meeting_id", (q) => q.eq("meeting_id", meeting._id))
          .collect();
        
        if (tokens.length === 0) return null;
        
        tokens.sort((a, b) => b.rotation_sequence - a.rotation_sequence);
        const current = tokens[0];
        
        return {
          meetingId: meeting._id,
          sessionId: meeting.session_id || null,
          token: current.token,
          rotation: current.rotation_sequence,
          expiresAt: current.expires_at,
          attendanceCount: attendanceCount.length,
          adminName: adminName,
          activatedAt: meeting.activated_at,
          hasSecret: false, // Legacy system
        };
      })
    );
    
    return results.filter((r) => r !== null);
  },
});

// Get active sessions for the current admin
export const getMyActiveSessions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return [];
    
    const user = await ctx.db.get(session.user_id);
    if (!user) return [];
    
    const today = toNigeriaYYYYMMDD(new Date());
    
    // Get active meetings created by this admin
    const meetings = await ctx.db
      .query("meetings")
      .filter((q) => q.and(
        q.eq(q.field("meeting_date"), today),
        q.eq(q.field("is_active"), true),
        q.eq(q.field("activated_by_admin_id"), user._id)
      ))
      .collect();
    
    return meetings.map((m) => ({
      meetingId: m._id,
      sessionId: m.session_id || null,
      activatedAt: m.activated_at,
    }));
  },
});


