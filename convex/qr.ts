import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import {
  generateQrToken,
  isWithinMeetingWindow,
  nowMs,
  toNigeriaYYYYMMDD,
} from "./utils";

const DEFAULT_ROTATION_SEC = Number(process.env.QR_ROTATION_INTERVAL || 45);
const EXPIRY_BUFFER_SEC = Number(process.env.QR_EXPIRY_BUFFER || 5);

// Determine groups meeting today for an admin (or all, for super admin)
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

    const nigeriaDate = toNigeriaYYYYMMDD(new Date());
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });

    const groups = await ctx.db.query("cds_groups").collect();
    const meetingToday = groups.filter((g) => g.meeting_days.includes(weekday));

    if (user.role === "super_admin") return meetingToday;

    // Get admin assignments from both sources
    const assignments = await ctx.db
      .query("admin_group_assignments")
      .filter((q) => q.eq(q.field("admin_id"), user._id))
      .collect();
    
    const allowedFromAssignments = new Set(assignments.map((a) => a.cds_group_id));
    const allowedFromAdminIds = new Set(meetingToday.filter((g) => g.admin_ids.includes(user._id)).map((g) => g._id));
    
    // Combine both assignment methods
    const allAllowed = new Set([...allowedFromAssignments, ...allowedFromAdminIds]);
    
    return meetingToday.filter((g) => allAllowed.has(g._id));
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

    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Lagos" });
    const today = toNigeriaYYYYMMDD(new Date());

    // groups admin can operate
    let groups = await ctx.db.query("cds_groups").collect();
    if (admin.role !== "super_admin") {
      const assignments = await ctx.db
        .query("admin_group_assignments")
        .filter((q) => q.eq(q.field("admin_id"), admin._id))
        .collect();
      
      // Get assignments from both sources
      const allowedFromAssignments = new Set(assignments.map((a) => a.cds_group_id));
      const allowedFromAdminIds = new Set(groups.filter((g) => g.admin_ids.includes(admin._id)).map((g) => g._id));
      
      // Combine both assignment methods
      const allAllowed = new Set([...allowedFromAssignments, ...allowedFromAdminIds]);
      
      groups = groups.filter((g) => allAllowed.has(g._id));
    }
    const todayGroups = groups.filter((g) => g.meeting_days.includes(weekday));
    
    if (todayGroups.length === 0) {
      throw new Error("None of your assigned CDS groups meet today.");
    }

    // Pick meeting window from first group; policy uses same day session for all
    const refGroup = todayGroups[0];
    const withinWindow = isWithinMeetingWindow(
      refGroup.meeting_time,
      refGroup.meeting_duration,
      30,
      0,
    );
    if (!withinWindow) {
      throw new Error("Not within meeting time window for QR generation.");
    }

    // Ensure single active session for today
    const existing = await ctx.db
      .query("meetings")
      .filter((q) => q.eq(q.field("meeting_date"), today))
      .unique();
    if (existing && existing.is_active) {
      throw new Error("QR generation already active for today.");
    }

    const meetingId = existing
      ? existing._id
      : await ctx.db.insert("meetings", {
          meeting_date: today,
          cds_group_ids: todayGroups.map((g) => g._id),
          is_active: true,
          activated_by_admin_id: admin._id,
          activated_at: nowMs(),
          deactivated_at: undefined,
        });

    if (existing && !existing.is_active) {
      await ctx.db.patch(existing._id, {
        is_active: true,
        activated_by_admin_id: admin._id,
        activated_at: nowMs(),
        deactivated_at: undefined,
      });
    }

    // Create initial token
    const token = generateQrToken(32);
    const generatedAt = nowMs();
    const expiresAt = generatedAt + (DEFAULT_ROTATION_SEC + EXPIRY_BUFFER_SEC) * 1000;
    const tokenId = await ctx.db.insert("qr_tokens", {
      token,
      meeting_date: today,
      generated_by_admin_id: admin._id,
      generated_at: generatedAt,
      expires_at: expiresAt,
      rotation_sequence: 1,
      is_consumed: false,
    });

    // schedule rotation
    await ctx.scheduler.runAfter(DEFAULT_ROTATION_SEC * 1000, api.qr.rotate, {
      meetingDate: today,
      nextSequence: 2,
      adminId: admin._id,
    });

    return { meetingId, tokenId, token, rotation: 1, expiresAt };
  },
});

export const rotate = mutation({
  args: { meetingDate: v.string(), nextSequence: v.number(), adminId: v.id("users") },
  handler: async (ctx, { meetingDate, nextSequence, adminId }) => {
    const meeting = await ctx.db
      .query("meetings")
      .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
      .unique();
    if (!meeting || !meeting.is_active) return false;

    // Stop automatically after meeting duration elapsed relative to activation group
    const groups = await ctx.db
      .query("cds_groups")
      .collect();
    // Use the first group's settings for window check (policy simplified)
    const refGroup = groups.find((g) => meeting.cds_group_ids.includes(g._id));
    if (!refGroup) return false;

    const withinWindow = isWithinMeetingWindow(refGroup.meeting_time, refGroup.meeting_duration, 0, 0);
    if (!withinWindow) {
      await ctx.db.patch(meeting._id, { is_active: false, deactivated_at: nowMs() });
      return false;
    }

    const token = generateQrToken(32);
    const generatedAt = nowMs();
    const expiresAt = generatedAt + (DEFAULT_ROTATION_SEC + EXPIRY_BUFFER_SEC) * 1000;
    await ctx.db.insert("qr_tokens", {
      token,
      meeting_date: meetingDate,
      generated_by_admin_id: adminId,
      generated_at: generatedAt,
      expires_at: expiresAt,
      rotation_sequence: nextSequence,
      is_consumed: false,
    });

    await ctx.scheduler.runAfter(DEFAULT_ROTATION_SEC * 1000, api.qr.rotate, {
      meetingDate,
      nextSequence: nextSequence + 1,
      adminId,
    });

    return true;
  },
});

export const stopQrSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");

    const today = toNigeriaYYYYMMDD(new Date());
    const meeting = await ctx.db
      .query("meetings")
      .filter((q) => q.eq(q.field("meeting_date"), today))
      .unique();
    if (!meeting) return false;
    await ctx.db.patch(meeting._id, { is_active: false, deactivated_at: nowMs() });
    return true;
  },
});

export const getActiveQr = query({
  args: { meetingDate: v.string() },
  handler: async (ctx, { meetingDate }) => {
    const meeting = await ctx.db
      .query("meetings")
      .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
      .unique();
    if (!meeting || !meeting.is_active) return null;
    // Latest token by sequence
    const tokens = await ctx.db
      .query("qr_tokens")
      .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
      .collect();
    if (tokens.length === 0) return null;
    tokens.sort((a, b) => b.rotation_sequence - a.rotation_sequence);
    const current = tokens[0];
    const count = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
      .collect();
    return { token: current.token, rotation: current.rotation_sequence, expiresAt: current.expires_at, attendanceCount: count.length };
  },
});


