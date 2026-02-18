import { query } from "./_generated/server";
import { v } from "convex/values";
import { toNigeriaYYYYMMDD } from "./utils";

// Limit expensive attendance stats to a rolling window to reduce document reads.
// This keeps Convex resource usage bounded even as historical data grows.
const ATTENDANCE_STATS_LOOKBACK_DAYS = 365;

export const getStats = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const startOfWeek = now - (7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date().setHours(0, 0, 0, 0);

    // Get all users (typically much smaller than attendance)
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const newUsersThisMonth = users.filter(u => u.created_at >= startOfMonth).length;
    const newUsersThisWeek = users.filter(u => u.created_at >= startOfWeek).length;

    // Get all CDS groups
    const groups = await ctx.db.query("cds_groups").collect();
    const totalGroups = groups.length;

    // Get attendance records within a rolling window to avoid scanning unbounded history
    const lookbackStart = now - ATTENDANCE_STATS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_scanned_at", q => q.gte("scanned_at", lookbackStart))
      .collect();

    const totalAttendance = attendance.length;
    const attendanceThisMonth = attendance.filter(a => a.scanned_at >= startOfMonth).length;
    const attendanceToday = attendance.filter(a => a.scanned_at >= startOfDay).length;

    // Get active QR sessions for today (Nigeria date) so count matches start/stop
    const todayNigeria = toNigeriaYYYYMMDD(new Date());
    const activeMeetings = await ctx.db.query("meetings")
      .filter(q => q.and(
        q.eq(q.field("is_active"), true),
        q.eq(q.field("meeting_date"), todayNigeria)
      ))
      .collect();
    const activeSessions = activeMeetings.length;

    // Get attendance by role
    const attendanceByRole = users.reduce((acc, user) => {
      const userAttendance = attendance.filter(a => a.user_id === user._id);
      acc[user.role] = (acc[user.role] || 0) + userAttendance.length;
      return acc;
    }, {} as Record<string, number>);

    // Get attendance by CDS group
    const attendanceByGroup = groups.reduce((acc, group) => {
      const groupAttendance = attendance.filter(a => a.cds_group_id === group._id);
      acc[group.name] = groupAttendance.length;
      return acc;
    }, {} as Record<string, number>);

    // Get recent attendance (last 7 days)
    const recentAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = date.setHours(0, 0, 0, 0);
      const endOfDay = date.setHours(23, 59, 59, 999);
      
      const dayAttendance = attendance.filter(a => 
        a.scanned_at >= startOfDay && a.scanned_at <= endOfDay
      ).length;
      
      recentAttendance.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: dayAttendance
      });
    }

    return {
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalGroups,
      totalAttendance,
      attendanceThisMonth,
      attendanceToday,
      activeSessions,
      attendanceByRole,
      attendanceByGroup,
      recentAttendance
    };
  },
});

export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const startOfWeek = now - (7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date().setHours(0, 0, 0, 0);

    // Get user's attendance records
    const userAttendance = await ctx.db.query("attendance")
      .filter(q => q.eq(q.field("user_id"), userId))
      .collect();
    
    const totalAttendance = userAttendance.length;
    const attendanceThisMonth = userAttendance.filter(a => a.scanned_at >= startOfMonth).length;
    const attendanceToday = userAttendance.filter(a => a.scanned_at >= startOfDay).length;

    // Get recent attendance (last 7 days) for this user
    const recentAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = date.setHours(0, 0, 0, 0);
      const endOfDay = date.setHours(23, 59, 59, 999);
      
      const dayAttendance = userAttendance.filter(a => 
        a.scanned_at >= startOfDay && a.scanned_at <= endOfDay
      ).length;
      
      recentAttendance.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: dayAttendance
      });
    }

    return {
      totalAttendance,
      attendanceThisMonth,
      attendanceToday,
      recentAttendance
    };
  },
});

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()), userId: v.optional(v.id("users")) },
  handler: async (ctx, { limit = 10, userId }) => {
    let attendance;
    if (userId) {
      // Get user-specific activity
      attendance = await ctx.db.query("attendance")
        .filter(q => q.eq(q.field("user_id"), userId))
        .order("desc")
        .take(limit);
    } else {
      // Get all activity (for admin/super_admin)
      attendance = await ctx.db.query("attendance")
        .order("desc")
        .take(limit);
    }
    
    const activities = await Promise.all(
      attendance.map(async (record) => {
        const user = await ctx.db.get(record.user_id);
        const group = await ctx.db.get(record.cds_group_id);
        return {
          id: record._id,
          user: user?.name || "Unknown",
          group: group?.name || "Unknown",
          timestamp: record.scanned_at,
          type: "attendance"
        };
      })
    );

    return activities;
  },
});

export const getTopGroups = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const groups = await ctx.db.query("cds_groups").collect();
    const now = Date.now();
    const lookbackStart = now - ATTENDANCE_STATS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

    // Only consider attendance within the same rolling window as getStats
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_scanned_at", q => q.gte("scanned_at", lookbackStart))
      .collect();

    const groupStats = groups.map(group => {
      const groupAttendance = attendance.filter(a => a.cds_group_id === group._id);
      return {
        id: group._id,
        name: group.name,
        attendanceCount: groupAttendance.length,
        meetingDays: group.meeting_days,
        meetingTime: group.meeting_time
      };
    });

    return groupStats
      .sort((a, b) => b.attendanceCount - a.attendanceCount)
      .slice(0, limit);
  },
});
