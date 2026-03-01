import { prisma } from "@/lib/db";
import { toNigeriaYYYYMMDD } from "@/lib/server-utils";

const ATTENDANCE_STATS_LOOKBACK_DAYS = 365;

export async function getStats(userId?: string) {
  const now = Date.now();
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).getTime();
  const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const lookbackStart =
    now - ATTENDANCE_STATS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  // Use count/aggregate/groupBy instead of findMany to minimize RUs
  const [
    totalUsers,
    newUsersThisMonth,
    newUsersThisWeek,
    totalGroups,
    totalAttendance,
    attendanceThisMonth,
    attendanceToday,
    groups,
    attendanceByGroupRows,
    attendanceByUserRows,
    activeSessions,
    recentAttendanceCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { created_at: { gte: BigInt(startOfMonth) } },
    }),
    prisma.user.count({
      where: { created_at: { gte: BigInt(startOfWeek) } },
    }),
    prisma.cdsGroup.count(),
    prisma.attendance.count({
      where: { scanned_at: { gte: BigInt(lookbackStart) } },
    }),
    prisma.attendance.count({
      where: { scanned_at: { gte: BigInt(startOfMonth) } },
    }),
    prisma.attendance.count({
      where: { scanned_at: { gte: BigInt(startOfDay) } },
    }),
    prisma.cdsGroup.findMany({
      select: { id: true, name: true },
      take: 100,
    }),
    prisma.attendance.groupBy({
      by: ["cds_group_id"],
      _count: true,
      where: { scanned_at: { gte: BigInt(lookbackStart) } },
    }),
    prisma.attendance.groupBy({
      by: ["user_id"],
      _count: true,
      where: { scanned_at: { gte: BigInt(lookbackStart) } },
    }),
    prisma.meeting.count({
      where: {
        is_active: true,
        meeting_date: toNigeriaYYYYMMDD(new Date()),
      },
    }),
    Promise.all(
      [6, 5, 4, 3, 2, 1, 0].map((i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date).setHours(0, 0, 0, 0);
        const dayEnd = new Date(date).setHours(23, 59, 59, 999);
        return prisma.attendance.count({
          where: {
            scanned_at: {
              gte: BigInt(dayStart),
              lte: BigInt(dayEnd),
            },
          },
        });
      }),
    ),
  ]);

  // Fetch only users who have attendance (typically 100-500, not all users)
  const userIds = [...new Set(attendanceByUserRows.map((r) => r.user_id))];
  const userRoles =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, role: true },
        })
      : [];

  const roleMap = new Map(userRoles.map((u) => [u.id, u.role]));
  const attendanceByRole: Record<string, number> = {};
  for (const row of attendanceByUserRows) {
    const role = roleMap.get(row.user_id) ?? "unknown";
    attendanceByRole[role] = (attendanceByRole[role] || 0) + row._count;
  }

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));
  const attendanceByGroup: Record<string, number> = {};
  for (const row of attendanceByGroupRows) {
    const name = row.cds_group_id
      ? groupMap.get(row.cds_group_id) ?? "Unknown"
      : "Unknown";
    attendanceByGroup[name] = row._count;
  }

  const recentAttendance: { date: string; value: number }[] = [6, 5, 4, 3, 2, 1, 0].map(
    (i, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: recentAttendanceCounts[idx] ?? 0,
      };
    },
  );

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
    recentAttendance,
  };
}

export async function getUserStats(userId: string) {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).getTime();
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  const [totalAttendance, attendanceThisMonth, attendanceToday, recentCounts] =
    await Promise.all([
      prisma.attendance.count({ where: { user_id: userId } }),
      prisma.attendance.count({
        where: {
          user_id: userId,
          scanned_at: { gte: BigInt(startOfMonth) },
        },
      }),
      prisma.attendance.count({
        where: {
          user_id: userId,
          scanned_at: { gte: BigInt(startOfDay) },
        },
      }),
      Promise.all(
        [6, 5, 4, 3, 2, 1, 0].map((i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date).setHours(0, 0, 0, 0);
          const dayEnd = new Date(date).setHours(23, 59, 59, 999);
          return prisma.attendance.count({
            where: {
              user_id: userId,
              scanned_at: {
                gte: BigInt(dayStart),
                lte: BigInt(dayEnd),
              },
            },
          });
        }),
      ),
    ]);

  const recentAttendance = [6, 5, 4, 3, 2, 1, 0].map((i, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: recentCounts[idx] ?? 0,
    };
  });

  return {
    totalAttendance,
    attendanceThisMonth,
    attendanceToday,
    recentAttendance,
  };
}

export async function getRecentActivity(limit = 10, userId?: string) {
  const attendance = await prisma.attendance.findMany({
    where: userId ? { user_id: userId } : undefined,
    orderBy: { scanned_at: "desc" },
    take: limit,
    select: {
      id: true,
      user_id: true,
      cds_group_id: true,
      scanned_at: true,
    },
  });

  if (attendance.length === 0) return [];

  const userIds = [...new Set(attendance.map((a) => a.user_id))];
  const groupIds = [...new Set(attendance.map((a) => a.cds_group_id).filter(Boolean))];

  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    }),
    prisma.cdsGroup.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  return attendance.map((record) => ({
    id: record.id,
    user: userMap.get(record.user_id) || "Unknown",
    group: record.cds_group_id
      ? groupMap.get(record.cds_group_id) || "Unknown"
      : "Unknown",
    timestamp: Number(record.scanned_at),
    type: "attendance" as const,
  }));
}

export async function getTopGroups(limit = 5) {
  const lookbackStart =
    Date.now() - ATTENDANCE_STATS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const [groupByRows, groups] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["cds_group_id"],
      _count: true,
      where: { scanned_at: { gte: BigInt(lookbackStart) } },
    }),
    prisma.cdsGroup.findMany({
      select: { id: true, name: true, meeting_days: true, meeting_time: true },
      take: 100,
    }),
  ]);

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const groupStats = groupByRows
    .filter((r) => r.cds_group_id)
    .map((row) => {
      const group = groupMap.get(row.cds_group_id!);
      return {
        id: row.cds_group_id,
        name: group?.name ?? "Unknown",
        attendanceCount: row._count,
        meetingDays: group?.meeting_days,
        meetingTime: group?.meeting_time,
      };
    })
    .sort((a, b) => b.attendanceCount - a.attendanceCount)
    .slice(0, limit);

  return groupStats;
}
