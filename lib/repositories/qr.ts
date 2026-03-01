import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";
import {
  toNigeriaYYYYMMDD,
  isWithinMeetingWindow,
  generateRandomTokenHex,
} from "@/lib/server-utils";

const DEFAULT_ROTATION_SEC = Number(process.env.QR_ROTATION_INTERVAL || 45);

export async function getTodayGroups(sessionToken?: string) {
  if (!sessionToken) return { groups: [], meetingToday: [] };
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) return { groups: [], meetingToday: [] };
  const user = session.user;
  if (!user) return { groups: [], meetingToday: [] };

  const weekday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Lagos",
  });

  const groups = await prisma.cdsGroup.findMany();
  const meetingToday = groups.filter((g) =>
    (g.meeting_days as string[]).includes(weekday),
  );

  if (user.role === "super_admin" || user.role === "admin") {
    return meetingToday;
  }
  return [];
}

export async function getTodayGroupsWithSessions(sessionToken?: string) {
  if (!sessionToken) return [];
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) return [];
  const user = session.user;
  if (!user) return [];
  if (user.role !== "super_admin" && user.role !== "admin") return [];

  const weekday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Lagos",
  });
  const today = toNigeriaYYYYMMDD(new Date());

  const groups = await prisma.cdsGroup.findMany();
  const meetingToday = groups.filter((g) =>
    (g.meeting_days as string[]).includes(weekday),
  );

  const activeMeetings = await prisma.meeting.findMany({
    where: { meeting_date: today, is_active: true },
  });

  const meetingMap = new Map<string, (typeof activeMeetings)[0]>();
  for (const meeting of activeMeetings) {
    if (meeting.cds_group_id) {
      meetingMap.set(meeting.cds_group_id, meeting);
    } else {
      const cdsGroupIds = meeting.cds_group_ids as string[] | null;
      if (cdsGroupIds?.length) {
        meetingMap.set(cdsGroupIds[0], meeting);
      }
    }
  }

  const results = await Promise.all(
    meetingToday.map(async (group) => {
      const meeting = meetingMap.get(group.id);
      let managingAdmin: { id: string; name: string } | null = null;
      if (meeting?.activated_by_admin_id) {
        const admin = await prisma.user.findUnique({
          where: { id: meeting.activated_by_admin_id },
        });
        if (admin) managingAdmin = { id: admin.id, name: admin.name };
      }
      return {
        _id: group.id,
        name: group.name,
        meeting_time: group.meeting_time,
        meeting_duration: group.meeting_duration,
        venue_name: group.venue_name,
        hasActiveSession: !!meeting,
        managingAdmin,
      };
    }),
  );
  return results;
}

export async function startQrSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const admin = session.user;
  if (!admin) throw new Error("Unauthorized");
  if (admin.role !== "super_admin" && admin.role !== "admin") {
    throw new Error("Only admins can start QR sessions.");
  }

  const weekday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Lagos",
  });
  const today = toNigeriaYYYYMMDD(new Date());

  const allGroups = await prisma.cdsGroup.findMany();
  const groupsMeetingToday = allGroups.filter((g) =>
    (g.meeting_days as string[]).includes(weekday),
  );
  if (groupsMeetingToday.length === 0) {
    throw new Error("No CDS groups are scheduled to meet today.");
  }

  const now = new Date();
  const withinWindowGroups = groupsMeetingToday.filter((group) =>
    isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 30, 0, now),
  );
  if (withinWindowGroups.length === 0) {
    throw new Error(
      "No CDS groups are currently within their meeting time window.",
    );
  }

  const sessionId = generateRandomTokenHex(16);
  const sessionSecret = generateRandomTokenHex(32);
  const rotationInterval = DEFAULT_ROTATION_SEC;

  const meetingId = (await prisma.meeting.create({
    data: {
      id: generateId(),
      meeting_date: today,
      session_id: sessionId,
      is_active: true,
      activated_by_admin_id: admin.id,
      activated_at: BigInt(Date.now()),
      session_secret: sessionSecret,
      rotation_interval_sec: rotationInterval,
      token_algorithm: "hmac-sha256",
    },
  })).id;

  return { meetingId, sessionId };
}

export async function stopQrSession(sessionToken: string, meetingId: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });
  if (!meeting) return false;

  const user = session.user;
  if (
    user &&
    user.role !== "super_admin" &&
    meeting.activated_by_admin_id !== session.user_id
  ) {
    throw new Error("You can only stop sessions you created.");
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { is_active: false, deactivated_at: BigInt(Date.now()) },
  });
  return true;
}

export async function getSessionSecret(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });
  if (!meeting || !meeting.is_active) return null;
  if (!meeting.session_secret) return null;
  return {
    secret: meeting.session_secret,
    rotationInterval: meeting.rotation_interval_sec || DEFAULT_ROTATION_SEC,
    meetingDate: meeting.meeting_date,
    isActive: meeting.is_active,
  };
}

export async function getActiveQr(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });
  if (!meeting || !meeting.is_active) return null;

  const today = meeting.meeting_date;
  const attendanceCount = await prisma.attendance.count({
    where: { meeting_date: today },
  });

  let adminName = "Unknown";
  if (meeting.activated_by_admin_id) {
    const admin = await prisma.user.findUnique({
      where: { id: meeting.activated_by_admin_id },
    });
    if (admin) adminName = admin.name;
  }

  return {
    token: null,
    rotation: 0,
    expiresAt: 0,
    attendanceCount,
    sessionId: meeting.session_id,
    meetingId: meeting.id,
    adminName,
  };
}

export function getTodayMeetingDate() {
  return toNigeriaYYYYMMDD(new Date());
}

export async function getAllActiveQr(meetingDate?: string) {
  const dateToUse = meetingDate ?? toNigeriaYYYYMMDD(new Date());
  const meetings = await prisma.meeting.findMany({
    where: { meeting_date: dateToUse, is_active: true },
  });

  const attendanceCount = await prisma.attendance.count({
    where: { meeting_date: dateToUse },
  });

  const results = await Promise.all(
    meetings.map(async (meeting) => {
      let adminName = "Unknown";
      if (meeting.activated_by_admin_id) {
        const admin = await prisma.user.findUnique({
          where: { id: meeting.activated_by_admin_id },
        });
        if (admin) adminName = admin.name;
      }

      if (meeting.session_secret) {
        return {
          meetingId: meeting.id,
          sessionId: meeting.session_id || null,
          token: null,
          rotation: 0,
          expiresAt: 0,
          attendanceCount,
          adminName,
          activatedAt: meeting.activated_at,
          hasSecret: true,
        };
      }

      const tokens = await prisma.qrToken.findMany({
        where: { meeting_id: meeting.id },
        orderBy: { rotation_sequence: "desc" },
      });
      if (tokens.length === 0) return null;
      const current = tokens[0];
      return {
        meetingId: meeting.id,
        sessionId: meeting.session_id || null,
        token: current.token,
        rotation: current.rotation_sequence,
        expiresAt: current.expires_at,
        attendanceCount,
        adminName,
        activatedAt: meeting.activated_at,
        hasSecret: false,
      };
    }),
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function getMyActiveSessions(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) return [];
  const user = session.user;
  if (!user) return [];

  const today = toNigeriaYYYYMMDD(new Date());
  const meetings = await prisma.meeting.findMany({
    where: {
      meeting_date: today,
      is_active: true,
      activated_by_admin_id: user.id,
    },
  });

  return meetings.map((m) => ({
    meetingId: m.id,
    sessionId: m.session_id || null,
    activatedAt: m.activated_at,
  }));
}
