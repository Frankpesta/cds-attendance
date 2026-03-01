import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";
import {
  toNigeriaYYYYMMDD,
  isWithinMeetingWindow,
  generateRandomTokenHex,
  generateQrTokenServer,
} from "@/lib/server-utils";
import {
  getCachedActiveMeetings,
  setCachedActiveMeetings,
  getCachedCdsGroup,
  setCachedCdsGroup,
  getCachedTodayAttendance,
  setCachedTodayAttendance,
} from "@/lib/cache";

const nowMs = () => Date.now();

type ActiveMeetingRow = {
  id: string;
  meeting_date: string;
  session_secret: string | null;
  rotation_interval_sec: number | null;
  activated_by_admin_id: string | null;
};

export async function submitScan(sessionToken: string, token: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const user = session.user;
  if (!user) throw new Error("Unauthorized");

  const todayDate = toNigeriaYYYYMMDD(new Date());

  const existing = await prisma.attendance.findFirst({
    where: { user_id: user.id, meeting_date: todayDate },
  });
  if (existing) {
    throw new Error("You already marked attendance today.");
  }

  // Cache CDS group lookup (60s) - 600 scans may hit same groups repeatedly
  let group = user.cds_group_id
    ? getCachedCdsGroup<Awaited<ReturnType<typeof prisma.cdsGroup.findUnique>>>(user.cds_group_id)
    : null;
  if (!group && user.cds_group_id) {
    group = await prisma.cdsGroup.findUnique({ where: { id: user.cds_group_id } });
    if (group) setCachedCdsGroup(user.cds_group_id, group);
  }
  if (!group) throw new Error("No CDS group assigned.");
  const groupMeetingDays = group.meeting_days as string[];
  const weekday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Lagos",
  });
  if (!groupMeetingDays.includes(weekday)) {
    throw new Error("Your CDS group doesn't meet today.");
  }
  if (
    !isWithinMeetingWindow(group.meeting_time, group.meeting_duration, 15, 15)
  ) {
    throw new Error("Scanning is only available during meeting hours.");
  }

  const now = nowMs();
  let validToken = false;
  let validMeeting: ActiveMeetingRow | null = null;

  // Cache active meetings (10s) - same for ALL 600 scans; huge RU savings
  let activeMeetings = getCachedActiveMeetings<ActiveMeetingRow[]>(todayDate);
  if (!activeMeetings) {
    activeMeetings = await prisma.meeting.findMany({
      where: { meeting_date: todayDate, is_active: true },
      take: 10,
      select: {
        id: true,
        meeting_date: true,
        session_secret: true,
        rotation_interval_sec: true,
        activated_by_admin_id: true,
      },
    });
    setCachedActiveMeetings(todayDate, activeMeetings);
  }

  for (const meeting of activeMeetings) {
    if (!meeting.session_secret) continue;
    const rotationInterval = meeting.rotation_interval_sec || 50;
    const expectedToken = await generateQrTokenServer(
      meeting.session_secret,
      now,
      rotationInterval,
    );
    if (token === expectedToken) {
      validToken = true;
      validMeeting = meeting;
      break;
    }
    const prevWindowToken = await generateQrTokenServer(
      meeting.session_secret,
      now - rotationInterval * 1000,
      rotationInterval,
    );
    if (token === prevWindowToken) {
      validToken = true;
      validMeeting = meeting;
      break;
    }
    const nextWindowToken = await generateQrTokenServer(
      meeting.session_secret,
      now + rotationInterval * 1000,
      rotationInterval,
    );
    if (token === nextWindowToken) {
      validToken = true;
      validMeeting = meeting;
      break;
    }
  }

  let legacyQrToken: { id: string; meeting_id: string | null } | null = null;
  if (!validToken) {
    const qr = await prisma.qrToken.findFirst({
      where: { token },
      include: { meeting: true },
    });
    if (qr) {
      legacyQrToken = qr;
      if (Number(qr.expires_at) < now) {
        throw new Error("QR code expired. Please scan the current code.");
      }
      if (!qr.meeting_id) {
        throw new Error(
          "This QR code format is no longer supported. Please scan a current QR code.",
        );
      }
      const meeting = qr.meeting;
      if (
        meeting &&
        meeting.is_active &&
        meeting.meeting_date === todayDate
      ) {
        validToken = true;
        validMeeting = meeting;
      }
    }
  }

  if (!validToken || !validMeeting) {
    throw new Error("Invalid or expired QR code.");
  }

  if (validMeeting.meeting_date !== todayDate) {
    throw new Error("This QR code is not valid for today.");
  }

  let qrTokenId: string;
  if (validMeeting.session_secret) {
    const qrToken = await prisma.qrToken.create({
      data: {
        id: generateId(),
        token,
        meeting_date: todayDate,
        meeting_id: validMeeting.id,
        generated_by_admin_id: validMeeting.activated_by_admin_id || user.id,
        generated_at: BigInt(now),
        expires_at: BigInt(
          now + (validMeeting.rotation_interval_sec || 50) * 1000,
        ),
        rotation_sequence: 0,
        is_consumed: true,
      },
    });
    qrTokenId = qrToken.id;
  } else {
    if (!legacyQrToken) {
      const qr = await prisma.qrToken.findFirst({ where: { token } });
      if (!qr) throw new Error("QR token not found for legacy session.");
      legacyQrToken = qr;
    }
    qrTokenId = legacyQrToken.id;
  }

  const attendanceId = generateId();
  await prisma.attendance.create({
    data: {
      id: attendanceId,
      user_id: user.id,
      cds_group_id: group.id,
      meeting_date: todayDate,
      scanned_at: BigInt(now),
      qr_token_id: qrTokenId,
      status: "present",
    },
  });

  return { attendanceId };
}

export async function getUserHistory(userId: string, limit = 100) {
  const records = await prisma.attendance.findMany({
    where: { user_id: userId },
    orderBy: { scanned_at: "desc" },
    take: limit,
  });
  return records.map((r) => ({
    _id: r.id,
    user_id: r.user_id,
    cds_group_id: r.cds_group_id,
    qr_token_id: r.qr_token_id,
    status: r.status,
    timestamp: Number(r.scanned_at),
    meeting_date: r.meeting_date,
  }));
}

export async function getUserTodayAttendance(userId: string) {
  const today = toNigeriaYYYYMMDD(new Date());
  const records = await prisma.attendance.findMany({
    where: { user_id: userId, meeting_date: today },
  });
  return records.map((r) => ({
    _id: r.id,
    user_id: r.user_id,
    cds_group_id: r.cds_group_id,
    qr_token_id: r.qr_token_id,
    status: r.status,
    scanned_at: Number(r.scanned_at),
    meeting_date: r.meeting_date,
  }));
}

export async function getTodayAttendance() {
  const today = toNigeriaYYYYMMDD(new Date());
  const cached = getCachedTodayAttendance<
    { _id: string; user_id: string; cds_group_id: string; qr_token_id: string; status: string; scanned_at: number; meeting_date: string }[]
  >(today);
  if (cached) return cached;

  const records = await prisma.attendance.findMany({
    where: { meeting_date: today },
    take: 2000,
  });
  const result = records.map((r) => ({
    _id: r.id,
    user_id: r.user_id,
    cds_group_id: r.cds_group_id,
    qr_token_id: r.qr_token_id,
    status: r.status,
    scanned_at: Number(r.scanned_at),
    meeting_date: r.meeting_date,
  }));
  setCachedTodayAttendance(today, result);
  return result;
}

export async function markAttendanceManually(
  sessionToken: string,
  userId: string,
  meetingDate?: string,
) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const currentUser = session.user;
  if (!currentUser || currentUser.role !== "super_admin") {
    throw new Error("Forbidden: Super admin access required");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "corps_member") {
    throw new Error("Can only mark attendance for corps members");
  }
  if (!user.cds_group_id) {
    throw new Error("User does not have a CDS group assigned");
  }

  // Cache CDS group lookup (60s)
  let group = getCachedCdsGroup<Awaited<ReturnType<typeof prisma.cdsGroup.findUnique>>>(user.cds_group_id);
  if (!group) {
    group = await prisma.cdsGroup.findUnique({
      where: { id: user.cds_group_id },
    });
    if (group) setCachedCdsGroup(user.cds_group_id, group);
  }
  if (!group) throw new Error("CDS group not found");

  const today = meetingDate || toNigeriaYYYYMMDD(new Date());
  const now = nowMs();

  const existing = await prisma.attendance.findFirst({
    where: { user_id: userId, meeting_date: today },
  });
  if (existing) {
    throw new Error(`Attendance already marked for ${user.name} on ${today}`);
  }

  let qrTokenId: string;
  // Cache active meetings (10s) - same as submitScan
  let activeMeetings = getCachedActiveMeetings<ActiveMeetingRow[]>(today);
  if (!activeMeetings) {
    activeMeetings = await prisma.meeting.findMany({
      where: { meeting_date: today, is_active: true },
      take: 10,
      select: {
        id: true,
        meeting_date: true,
        session_secret: true,
        rotation_interval_sec: true,
        activated_by_admin_id: true,
      },
    });
    setCachedActiveMeetings(today, activeMeetings);
  }

  if (activeMeetings.length > 0) {
    const meeting = activeMeetings[0];
    const qrTokens = await prisma.qrToken.findMany({
      where: { meeting_id: meeting.id },
      orderBy: { rotation_sequence: "desc" },
      take: 1,
    });
    if (qrTokens.length > 0) {
      qrTokenId = qrTokens[0].id;
    } else {
      const manualToken = generateRandomTokenHex(32);
      const qrToken = await prisma.qrToken.create({
        data: {
          id: generateId(),
          token: manualToken,
          meeting_date: today,
          meeting_id: meeting.id,
          cds_group_id: group.id,
          generated_by_admin_id: currentUser.id,
          generated_at: BigInt(now),
          expires_at: BigInt(now + 24 * 60 * 60 * 1000),
          rotation_sequence: 0,
          is_consumed: false,
        },
      });
      qrTokenId = qrToken.id;
    }
  } else {
    const manualToken = generateRandomTokenHex(32);
    const qrToken = await prisma.qrToken.create({
      data: {
        id: generateId(),
        token: manualToken,
        meeting_date: today,
        cds_group_id: group.id,
        generated_by_admin_id: currentUser.id,
        generated_at: BigInt(now),
        expires_at: BigInt(now + 24 * 60 * 60 * 1000),
        rotation_sequence: 0,
        is_consumed: false,
      },
    });
    qrTokenId = qrToken.id;
  }

  const attendanceId = generateId();
  await prisma.attendance.create({
    data: {
      id: attendanceId,
      user_id: userId,
      cds_group_id: group.id,
      meeting_date: today,
      scanned_at: BigInt(now),
      qr_token_id: qrTokenId,
      status: "present",
    },
  });

  return { attendanceId, meetingDate: today };
}
