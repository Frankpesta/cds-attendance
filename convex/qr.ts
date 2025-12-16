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
  args: { sessionToken: v.string(), cdsGroupId: v.id("cds_groups") },
  handler: async (ctx, { sessionToken, cdsGroupId }) => {
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

    // Verify group meets today
    const group = await ctx.db.get(cdsGroupId);
    if (!group) throw new Error("CDS group not found.");
    if (!group.meeting_days.includes(weekday)) {
      throw new Error("This CDS group doesn't meet today.");
    }

    // Check meeting time window
    const withinWindow = isWithinMeetingWindow(
      group.meeting_time,
      group.meeting_duration,
      30,
      0,
    );
    if (!withinWindow) {
      throw new Error("Not within meeting time window for QR generation.");
    }

    // Check if there's already an active session for this group today
    // Try new format first (by_group_date index)
    let existing = await ctx.db
      .query("meetings")
      .withIndex("by_group_date", (q) => q.eq("cds_group_id", cdsGroupId).eq("meeting_date", today))
      .unique();
    
    // Fallback: check old format (cds_group_ids array) if not found
    if (!existing) {
      const allTodayMeetings = await ctx.db
        .query("meetings")
        .filter((q) => q.eq(q.field("meeting_date"), today))
        .collect();
      const found = allTodayMeetings.find(
        (m) => m.cds_group_ids && m.cds_group_ids.includes(cdsGroupId)
      );
      existing = found || null;
      
      // Migrate old format to new format if found
      if (existing && existing.cds_group_ids) {
        // If this is the only group in the array, migrate it
        if (existing.cds_group_ids.length === 1) {
          await ctx.db.patch(existing._id, {
            cds_group_id: cdsGroupId,
            cds_group_ids: undefined, // Remove old field
          });
          existing = await ctx.db.get(existing._id);
        } else {
          // Multiple groups - create separate meeting for this group
          // (old meetings with multiple groups will need manual migration)
        }
      }
    }
    
    if (existing && existing.is_active) {
      // Get the admin who started this session
      let adminName = "another admin";
      if (existing.activated_by_admin_id) {
        const managingAdmin = await ctx.db.get(existing.activated_by_admin_id);
        if (managingAdmin) {
          adminName = managingAdmin.name;
        }
      }
      throw new Error(`QR session already active for this CDS group. It is currently being managed by ${adminName}.`);
    }

    const meetingId = existing
      ? existing._id
      : await ctx.db.insert("meetings", {
          meeting_date: today,
          cds_group_id: cdsGroupId,
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
      cds_group_id: cdsGroupId,
      generated_by_admin_id: admin._id,
      generated_at: generatedAt,
      expires_at: expiresAt,
      rotation_sequence: 1,
      is_consumed: false,
    });

    // schedule rotation
    await ctx.scheduler.runAfter(DEFAULT_ROTATION_SEC * 1000, api.qr.rotate, {
      meetingDate: today,
      cdsGroupId: cdsGroupId,
      nextSequence: 2,
      adminId: admin._id,
    });

    return { meetingId, tokenId, token, rotation: 1, expiresAt, cdsGroupId };
  },
});

export const rotate = mutation({
  args: { meetingDate: v.string(), cdsGroupId: v.id("cds_groups"), nextSequence: v.number(), adminId: v.id("users") },
  handler: async (ctx, { meetingDate, cdsGroupId, nextSequence, adminId }) => {
    // Try new format first
    let meeting = await ctx.db
      .query("meetings")
      .withIndex("by_group_date", (q) => q.eq("cds_group_id", cdsGroupId).eq("meeting_date", meetingDate))
      .unique();
    
    // Fallback: check old format if not found
    if (!meeting) {
      const allMeetings = await ctx.db
        .query("meetings")
        .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
        .collect();
      const found = allMeetings.find(
        (m) => m.cds_group_ids && m.cds_group_ids.includes(cdsGroupId)
      );
      meeting = found || null;
    }
    
    if (!meeting || !meeting.is_active) return false;

    // Get the group for window check
    const group = await ctx.db.get(cdsGroupId);
    if (!group) return false;

    const withinWindow = isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 0, 0);
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
      cds_group_id: cdsGroupId,
      generated_by_admin_id: adminId,
      generated_at: generatedAt,
      expires_at: expiresAt,
      rotation_sequence: nextSequence,
      is_consumed: false,
    });

    await ctx.scheduler.runAfter(DEFAULT_ROTATION_SEC * 1000, api.qr.rotate, {
      meetingDate,
      cdsGroupId,
      nextSequence: nextSequence + 1,
      adminId,
    });

    return true;
  },
});

export const stopQrSession = mutation({
  args: { sessionToken: v.string(), cdsGroupId: v.id("cds_groups") },
  handler: async (ctx, { sessionToken, cdsGroupId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");

    const today = toNigeriaYYYYMMDD(new Date());
    // Try new format first
    let meeting = await ctx.db
      .query("meetings")
      .withIndex("by_group_date", (q) => q.eq("cds_group_id", cdsGroupId).eq("meeting_date", today))
      .unique();
    
    // Fallback: check old format if not found
    if (!meeting) {
      const allMeetings = await ctx.db
        .query("meetings")
        .filter((q) => q.eq(q.field("meeting_date"), today))
        .collect();
      const found = allMeetings.find(
        (m) => m.cds_group_ids && m.cds_group_ids.includes(cdsGroupId)
      );
      meeting = found || null;
    }
    
    if (!meeting) return false;
    await ctx.db.patch(meeting._id, { is_active: false, deactivated_at: nowMs() });
    return true;
  },
});

export const getActiveQr = query({
  args: { meetingDate: v.string(), cdsGroupId: v.optional(v.id("cds_groups")) },
  handler: async (ctx, { meetingDate, cdsGroupId }) => {
    // If cdsGroupId is not provided, return null (shouldn't happen in normal flow)
    if (!cdsGroupId) {
      return null;
    }
    // Try new format first
    let meeting = await ctx.db
      .query("meetings")
      .withIndex("by_group_date", (q) => q.eq("cds_group_id", cdsGroupId).eq("meeting_date", meetingDate))
      .unique();
    
    // Fallback: check old format if not found
    if (!meeting) {
      const allMeetings = await ctx.db
        .query("meetings")
        .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
        .collect();
      const found = allMeetings.find(
        (m) => m.cds_group_ids && m.cds_group_ids.includes(cdsGroupId)
      );
      meeting = found || null;
    }
    
    if (!meeting || !meeting.is_active) return null;
    
    // Latest token by sequence for this group
    // Try new format first (with cds_group_id)
    let tokens = await ctx.db
      .query("qr_tokens")
      .withIndex("by_group_date", (q) => q.eq("cds_group_id", cdsGroupId).eq("meeting_date", meetingDate))
      .collect();
    
    // Fallback: if no tokens with cds_group_id, get all tokens for the date and filter
    if (tokens.length === 0) {
      const allTokens = await ctx.db
        .query("qr_tokens")
        .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
        .collect();
      // For backward compatibility, if no cds_group_id is set, accept the token
      // (old tokens won't have cds_group_id)
      tokens = allTokens.filter((t) => !t.cds_group_id || t.cds_group_id === cdsGroupId);
    }
    
    if (tokens.length === 0) return null;
    tokens.sort((a, b) => b.rotation_sequence - a.rotation_sequence);
    const current = tokens[0];
    const count = await ctx.db
      .query("attendance")
      .filter((q) => q.and(
        q.eq(q.field("meeting_date"), meetingDate),
        q.eq(q.field("cds_group_id"), cdsGroupId)
      ))
      .collect();
    return { 
      token: current.token, 
      rotation: current.rotation_sequence, 
      expiresAt: current.expires_at, 
      attendanceCount: count.length,
      cdsGroupId: cdsGroupId
    };
  },
});

// Get all active QR sessions for a date (for super admin dashboard)
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
    
    const results = await Promise.all(
      meetings.map(async (meeting) => {
        // Handle both new format (cds_group_id) and old format (cds_group_ids)
        let groupId: any = null;
        if (meeting.cds_group_id) {
          groupId = meeting.cds_group_id;
        } else if (meeting.cds_group_ids && meeting.cds_group_ids.length > 0) {
          // Old format - use first group (for backward compatibility)
          groupId = meeting.cds_group_ids[0];
        }
        
        if (!groupId) return null;
        
        // Get tokens for this group
        let tokens = await ctx.db
          .query("qr_tokens")
          .withIndex("by_group_date", (q) => q.eq("cds_group_id", groupId).eq("meeting_date", meetingDate))
          .collect();
        
        // Fallback: if no tokens with cds_group_id, get all tokens for the date
        if (tokens.length === 0) {
          const allTokens = await ctx.db
            .query("qr_tokens")
            .filter((q) => q.eq(q.field("meeting_date"), meetingDate))
            .collect();
          // For backward compatibility, if no cds_group_id is set, accept the token
          tokens = allTokens.filter((t) => !t.cds_group_id || t.cds_group_id === groupId);
        }
        
        if (tokens.length === 0) return null;
        tokens.sort((a, b) => b.rotation_sequence - a.rotation_sequence);
        const current = tokens[0];
        const group = await ctx.db.get(groupId as any);
        const count = await ctx.db
          .query("attendance")
          .filter((q) => q.and(
            q.eq(q.field("meeting_date"), meetingDate),
            q.eq(q.field("cds_group_id"), groupId)
          ))
          .collect();
        return {
          cdsGroupId: groupId,
          cdsGroupName: (group && "name" in group ? group.name : null) || "Unknown",
          token: current.token,
          rotation: current.rotation_sequence,
          expiresAt: current.expires_at,
          attendanceCount: count.length,
        };
      })
    );
    
    return results.filter((r) => r !== null);
  },
});


