import { prisma } from "@/lib/db";

export async function monthlyReport(args: {
  year: number;
  month: number;
  cdsGroupId?: string;
  userId?: string;
}) {
  const { year, month, cdsGroupId, userId } = args;
  const monthStr = String(month).padStart(2, "0");
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-31`;

  const groups = cdsGroupId
    ? [await prisma.cdsGroup.findUnique({ where: { id: cdsGroupId } })].filter(
        Boolean,
      )
    : await prisma.cdsGroup.findMany({ take: 100 });
  const groupIds = new Set(groups.map((g) => g!.id));

  // Fetch only needed columns; filter users by group to avoid full table scan
  const userWhere = userId
    ? { id: userId }
    : cdsGroupId
      ? { cds_group_id: cdsGroupId }
      : { cds_group_id: { in: [...groupIds] } };

  const [attendance, users] = await Promise.all([
    prisma.attendance.findMany({
      where: userId
        ? { user_id: userId, meeting_date: { gte: start, lte: end } }
        : { meeting_date: { gte: start, lte: end } },
      select: { user_id: true, cds_group_id: true, status: true, meeting_date: true },
      take: 10000,
    }),
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, state_code: true, name: true, cds_group_id: true },
      take: 5000,
    }),
  ]);

  const byUser = new Map<
    string,
    { count: number; dates: string[]; groupId: string | null }
  >();
  for (const a of attendance) {
    if (!userId && !groupIds.has(a.cds_group_id)) continue;
    const key = a.user_id;
    const entry =
      byUser.get(key) || { count: 0, dates: [], groupId: a.cds_group_id };
    entry.count += a.status === "present" ? 1 : 0;
    entry.dates.push(a.meeting_date);
    byUser.set(key, entry);
  }

  const groupMap = new Map(groups.map((g) => [g!.id, g!.name]));

  const result: {
    state_code: string;
    name: string;
    cds_group_id: string | null;
    cds_group_name: string;
    count: number;
    dates: string[];
  }[] = [];

  let expectedSessionsInMonth: number | undefined;
  if (userId) {
    const u = users.find((x) => x.id === userId);
    if (u?.cds_group_id) {
      const group = await prisma.cdsGroup.findUnique({
        where: { id: u.cds_group_id },
        select: { meeting_days: true },
      });
      const meetingDays = group?.meeting_days as string[] | undefined;
      if (meetingDays?.length) {
        const lastDay = new Date(year, month, 0).getDate();
        let count = 0;
        for (let d = 1; d <= lastDay; d++) {
          const date = new Date(year, month - 1, d);
          const weekday = date.toLocaleDateString("en-US", {
            weekday: "long",
          });
          if (meetingDays.includes(weekday)) count++;
        }
        expectedSessionsInMonth = count;
      }
    }
  }

  for (const u of users) {
    if (!u.cds_group_id || !groupIds.has(u.cds_group_id)) continue;
    if (userId && u.id !== userId) continue;
    const rec =
      byUser.get(u.id) || { count: 0, dates: [], groupId: u.cds_group_id };
    result.push({
      state_code: u.state_code,
      name: u.name,
      cds_group_id: u.cds_group_id,
      cds_group_name: (u.cds_group_id && groupMap.get(u.cds_group_id)) || "Unknown Group",
      count: rec.count,
      dates: rec.dates.sort(),
    });
  }

  return { groups, data: result, expectedSessionsInMonth };
}

export async function exportCsv(args: {
  year: number;
  month: number;
  cdsGroupId?: string;
  minAttendance?: number;
  maxAttendance?: number;
  stateCode?: string;
}): Promise<string> {
  const rep = await monthlyReport({
    year: args.year,
    month: args.month,
    cdsGroupId: args.cdsGroupId,
  });
  const groupMap = new Map(rep.groups.map((g) => [g!.id, g!.name]));
  let filteredData = rep.data;
  if (
    args.minAttendance !== undefined ||
    args.maxAttendance !== undefined ||
    args.stateCode
  ) {
    filteredData = rep.data.filter((row) => {
      const minCheck =
        args.minAttendance === undefined || row.count >= args.minAttendance!;
      const maxCheck =
        args.maxAttendance === undefined || row.count <= args.maxAttendance!;
      const stateCheck =
        !args.stateCode || row.state_code?.includes(args.stateCode);
      return minCheck && maxCheck && stateCheck;
    });
  }
  const lines = ["State Code,Name,CDS Group,Attendance Count,Dates"];
  for (const row of filteredData) {
    const groupName = (row as { cds_group_name?: string }).cds_group_name ?? groupMap.get(row.cds_group_id!) ?? "Unknown Group";
    lines.push(
      `${row.state_code},${row.name},"${groupName}",${row.count},"${row.dates.join(" ")}"`,
    );
  }
  return lines.join("\n");
}

export async function exportPdf(args: {
  year: number;
  month: number;
  cdsGroupId?: string;
  minAttendance?: number;
  maxAttendance?: number;
  stateCode?: string;
}): Promise<string> {
  const rep = await monthlyReport({
    year: args.year,
    month: args.month,
    cdsGroupId: args.cdsGroupId,
  });
  const groupMap = new Map(rep.groups.map((g) => [g!.id, g!.name]));
  let filteredData = rep.data;
  if (
    args.minAttendance !== undefined ||
    args.maxAttendance !== undefined ||
    args.stateCode
  ) {
    filteredData = rep.data.filter((row) => {
      const minCheck =
        args.minAttendance === undefined || row.count >= args.minAttendance!;
      const maxCheck =
        args.maxAttendance === undefined || row.count <= args.maxAttendance!;
      const stateCheck =
        !args.stateCode || row.state_code?.includes(args.stateCode);
      return minCheck && maxCheck && stateCheck;
    });
  }
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = monthNames[args.month - 1];
  const totalRecords = filteredData.length;
  const totalAttendance = filteredData.reduce((sum, row) => sum + row.count, 0);
  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Attendance Report - ${monthName} ${args.year}</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; }
.header { text-align: center; margin-bottom: 30px; }
.summary { margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
tr:nth-child(even) { background-color: #f9f9f9; }
.footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="header">
<h1>CDS Attendance Report</h1>
<h2>${monthName} ${args.year}</h2>
</div>
<div class="summary">
<h3>Summary</h3>
<p><strong>Total Records:</strong> ${totalRecords}</p>
<p><strong>Total Attendance Count:</strong> ${totalAttendance}</p>
<p><strong>Average Attendance per Member:</strong> ${totalRecords > 0 ? (totalAttendance / totalRecords).toFixed(2) : 0}</p>
</div>
<table>
<thead>
<tr>
<th>State Code</th>
<th>Name</th>
<th>CDS Group</th>
<th>Attendance Count</th>
<th>Attendance Dates</th>
</tr>
</thead>
<tbody>
`;
  for (const row of filteredData) {
    const groupName = (row as { cds_group_name?: string }).cds_group_name ?? groupMap.get(row.cds_group_id!) ?? "Unknown Group";
    html += `
<tr>
<td>${row.state_code}</td>
<td>${row.name}</td>
<td>${groupName}</td>
<td>${row.count}</td>
<td>${(row.dates ?? []).join(", ")}</td>
</tr>
`;
  }
  html += `
</tbody>
</table>
<div class="footer">
<p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
</div>
</body>
</html>
`;
  return html;
}

export async function exportUserPdf(args: {
  userId: string;
  year: number;
  month: number;
  baseUrl?: string;
}): Promise<string> {
  const rep = await monthlyReport({
    year: args.year,
    month: args.month,
    userId: args.userId,
  });
  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({ where: { id: args.userId } });
  if (!user) throw new Error("User not found");

  const { createClearanceVerification } = await import("./clearance");
  const verificationToken = await createClearanceVerification(
    args.userId,
    args.year,
    args.month,
  );
  const baseUrl = (args.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const verifyUrl = baseUrl ? `${baseUrl}/verify/clearance/${verificationToken}` : `/verify/clearance/${verificationToken}`;

  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const { getRequiredAttendanceCount } = await import("./settings");
  const requiredCount = await getRequiredAttendanceCount({
    stateCode: user.state_code,
  });

  let cdsGroupName = "Not Assigned";
  if (user.cds_group_id) {
    const cdsGroup = await prisma.cdsGroup.findUnique({
      where: { id: user.cds_group_id },
    });
    if (cdsGroup) cdsGroupName = cdsGroup.name;
  }

  const totalRecords = rep.expectedSessionsInMonth ?? rep.data.length;
  const totalAttendance = rep.data.reduce((sum, row) => sum + (row.count || 0), 0);
  const isCleared = totalAttendance >= requiredCount;
  const averageAttendance = isCleared
    ? "100"
    : requiredCount > 0
      ? Math.min(100, (totalAttendance / requiredCount) * 100).toFixed(2)
      : "0";

  if (totalAttendance < requiredCount) {
    throw new Error(
      `You need at least ${requiredCount} attendance(s) for this month to print the report. You currently have ${totalAttendance}.`,
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = monthNames[args.month - 1];

  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>CDS Clearance Certificate - ${user.name}</title>
<style>
@media print { body { margin: 0; } .page-break { page-break-before: always; } }
body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #000; background: white; }
.header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
.header h1 { color: #000; margin: 0; font-size: 24px; font-weight: bold; }
.header p { color: #000; margin: 10px 0 0 0; font-size: 16px; }
.certificate { border: 2px solid #000; padding: 20px; margin: 20px 0; }
.user-info { padding: 15px; margin: 15px 0; border: 1px solid #000; }
.user-info h3 { color: #000; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; }
.info-row { margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #ccc; overflow: hidden; }
.info-label { font-weight: bold; color: #000; width: 150px; float: left; }
.info-value { color: #000; margin-left: 160px; }
.stats { margin: 20px 0; overflow: hidden; }
.stat-card { padding: 15px; text-align: center; border: 1px solid #000; width: 30%; float: left; margin-right: 3%; }
.stat-card:last-child { margin-right: 0; }
.stat-number { font-size: 20px; font-weight: bold; color: #000; margin-bottom: 5px; }
.stat-label { color: #000; font-size: 12px; }
.status { text-align: center; margin: 30px 0; padding: 20px; border: 2px solid #000; background: ${isCleared ? "#f0f0f0" : "#f5f5f5"}; }
.status-icon { font-size: 20px; margin-bottom: 10px; }
.status-text { font-size: 16px; font-weight: bold; color: #000; }
.footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; color: #000; font-size: 12px; }
.attendance-dates { padding: 15px; margin: 15px 0; border: 1px solid #000; }
.attendance-dates h4 { color: #000; margin: 0 0 10px 0; font-size: 14px; font-weight: bold; }
.date-list { line-height: 1.8; }
.date-tag { background: #f0f0f0; color: #000; padding: 2px 6px; border: 1px solid #000; font-size: 10px; font-weight: normal; margin-right: 5px; display: inline-block; margin-bottom: 3px; }
.clearfix::after { content: ""; display: table; clear: both; }
.verification { text-align: center; margin: 20px 0; padding: 15px; border: 2px dashed #333; }
.verification-qr { display: inline-block; margin: 10px 0; }
.verification-id { font-size: 10px; font-family: monospace; color: #666; word-break: break-all; margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
<h1>CDS ATTENDANCE CLEARANCE CERTIFICATE</h1>
<p>${monthName} ${args.year}</p>
</div>
<div class="certificate">
<div class="user-info">
<h3>Personal Information</h3>
<div class="info-row"><span class="info-label">Full Name:</span><span class="info-value">${user.name}</span></div>
<div class="info-row"><span class="info-label">Email Address:</span><span class="info-value">${user.email}</span></div>
<div class="info-row"><span class="info-label">State Code:</span><span class="info-value">${user.state_code}</span></div>
<div class="info-row"><span class="info-label">CDS Group:</span><span class="info-value">${cdsGroupName}</span></div>
</div>
<div class="stats clearfix">
<div class="stat-card"><div class="stat-number">${totalRecords}</div><div class="stat-label">Total CDS Sessions</div></div>
<div class="stat-card"><div class="stat-number">${totalAttendance}</div><div class="stat-label">Times Attended</div></div>
<div class="stat-card"><div class="stat-number">${averageAttendance}%</div><div class="stat-label">Attendance Rate</div></div>
</div>
${rep.data.length > 0 ? `
<div class="attendance-dates">
<h4>Attendance Dates</h4>
<div class="date-list">
${rep.data.map((row) => row.dates.map((d) => `<span class="date-tag">${d}</span>`).join("")).join("")}
</div>
</div>
` : ""}
<div class="status">
<div class="status-icon">${isCleared ? "✅" : "⚠️"}</div>
<div class="status-text">${isCleared ? "CLEARED - Attendance requirement met (100%)" : "PENDING - Attendance requirement not met"}</div>
</div>
<div class="verification">
<p style="font-weight: bold; margin: 0 0 8px 0;">Verify authenticity: Scan QR code or visit the verification link</p>
<img class="verification-qr" src="${qrDataUrl}" alt="Verification QR" width="120" height="120" />
<p class="verification-id">Verification ID: ${verificationToken}</p>
</div>
</div>
<div class="footer">
<p><strong>CDS Attendance Management System</strong></p>
<p>This certificate is uniquely signed. Scan the QR code above to verify authenticity.</p>
<p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
</div>
</body>
</html>
`;
  return html;
}
