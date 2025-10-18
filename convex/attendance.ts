import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { haversineDistanceMeters, isWithinMeetingWindow, nowMs, toNigeriaYYYYMMDD } from "./utils";

const ATTENDANCE_RADIUS_METERS = Number(process.env.ATTENDANCE_RADIUS_METERS || 100);

export const submitScan = mutation({
  args: {
    sessionToken: v.string(),
    token: v.string(),
    coords: v.optional(v.object({ latitude: v.number(), longitude: v.number(), accuracy: v.optional(v.number()) })),
  },
  handler: async (ctx, { sessionToken, token, coords }) => {
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

    // Token validation
    const qr = await ctx.db
      .query("qr_tokens")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!qr) throw new Error("Invalid QR code.");
    const now = nowMs();
    if (qr.expires_at < now) throw new Error("QR code expired. Please scan the current code.");

    // Geolocation verification (best effort)
    let locationVerified = false;
    let scannedLocation: { latitude: number; longitude: number } | undefined = undefined;
    if (coords && typeof coords.latitude === "number" && typeof coords.longitude === "number") {
      scannedLocation = { latitude: coords.latitude, longitude: coords.longitude };
      const dist = haversineDistanceMeters(coords.latitude, coords.longitude, group.venue_coordinates.latitude, group.venue_coordinates.longitude);
      locationVerified = dist <= ATTENDANCE_RADIUS_METERS && (!coords.accuracy || coords.accuracy <= 100);
      if (!locationVerified) {
        throw new Error("You must be within 100m of the meeting venue to mark attendance.");
      }
    }

    const attendanceId = await ctx.db.insert("attendance", {
      user_id: user._id,
      cds_group_id: group._id,
      meeting_date: today,
      scanned_at: now,
      qr_token_id: qr._id,
      location_verified: locationVerified,
      scanned_location: scannedLocation,
      status: "present",
    });

    return { attendanceId };
  },
});

export const getUserHistory = query({
  args: {},
  handler: async (ctx) => {
    // This would need to be called with user context
    // For now, return all attendance records
    const attendance = await ctx.db.query("attendance").collect();
    
    return attendance.map(record => ({
      _id: record._id,
      user_id: record.user_id,
      cds_group_id: record.cds_group_id,
      qr_token_id: record.qr_token_id,
      status: record.status,
      latitude: record.scanned_location?.latitude,
      longitude: record.scanned_location?.longitude,
      timestamp: record.scanned_at,
      meeting_date: record.meeting_date,
      location_verified: record.location_verified,
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
      location_verified: record.location_verified,
      scanned_location: record.scanned_location,
    }));
  },
});

