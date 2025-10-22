import { query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const monthlyReport = query({
	args: {
		year: v.number(),
		month: v.number(), // 1-12
		cdsGroupId: v.optional(v.id("cds_groups")),
		userId: v.optional(v.id("users")),
	},
	handler: async (ctx, { year, month, cdsGroupId, userId }) => {
		const monthStr = String(month).padStart(2, "0");
		const start = `${year}-${monthStr}-01`;
		const end = `${year}-${monthStr}-31`;

		const groups = cdsGroupId
			? [await ctx.db.get(cdsGroupId)].filter(Boolean)
			: await ctx.db.query("cds_groups").collect();

		const groupIds = new Set(groups.map((g) => g!._id));

		let attendance;
		if (userId) {
			// Get user-specific attendance
			attendance = await ctx.db
				.query("attendance")
				.filter((q) => q.and(
					q.eq(q.field("user_id"), userId),
					q.gte(q.field("meeting_date"), start), 
					q.lte(q.field("meeting_date"), end)
				))
				.collect();
		} else {
			// Get all attendance for the groups
			attendance = await ctx.db
				.query("attendance")
				.filter((q) => q.and(q.gte(q.field("meeting_date"), start), q.lte(q.field("meeting_date"), end)))
				.collect();
		}

		// Map user -> count and dates
		const byUser = new Map<string, { count: number; dates: string[]; groupId: string }>();
		for (const a of attendance) {
			if (!groupIds.has(a.cds_group_id)) continue;
			const key = a.user_id as unknown as string;
			const entry = byUser.get(key) || { count: 0, dates: [], groupId: a.cds_group_id as unknown as string };
			entry.count += a.status === "present" ? 1 : 0;
			entry.dates.push(a.meeting_date);
			byUser.set(key, entry);
		}

		const users = await ctx.db.query("users").collect();
		const result = [] as any[];
		for (const u of users) {
			if (!groupIds.has(u.cds_group_id as any)) continue;
			if (userId && u._id !== userId) continue; // Filter to specific user if userId provided
			const rec = byUser.get(u._id as unknown as string) || { count: 0, dates: [], groupId: u.cds_group_id };
			result.push({
				state_code: u.state_code,
				name: u.name,
				cds_group_id: u.cds_group_id,
				count: rec.count,
				dates: rec.dates.sort(),
			});
		}
		return { groups, data: result };
	},
});

export const exportCsv = action({
	args: { 
		year: v.number(), 
		month: v.number(), 
		cdsGroupId: v.optional(v.id("cds_groups")),
		minAttendance: v.optional(v.number()),
		maxAttendance: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<{ csv: string }> => {
		const rep = await ctx.runQuery(api.reports.monthlyReport, {
			year: args.year,
			month: args.month,
			cdsGroupId: args.cdsGroupId
		});
		
		// Create a map of group IDs to names
		const groupMap = new Map();
		for (const group of rep.groups) {
			groupMap.set(group._id, group.name);
		}
		
		// Filter data based on attendance count if specified
		let filteredData = rep.data;
		if (args.minAttendance !== undefined || args.maxAttendance !== undefined) {
			filteredData = rep.data.filter((row: any) => {
				const count = row.count;
				const minCheck = args.minAttendance === undefined || count >= args.minAttendance;
				const maxCheck = args.maxAttendance === undefined || count <= args.maxAttendance;
				return minCheck && maxCheck;
			});
		}
		
		const lines = ["State Code,Name,CDS Group,Attendance Count,Dates"];
		for (const row of filteredData as any[]) {
			const groupName = groupMap.get(row.cds_group_id) || "Unknown Group";
			lines.push(
				`${row.state_code},${row.name},"${groupName}",${row.count},"${row.dates.join(" ")}"`,
			);
		}
		return { csv: lines.join("\n") };
	},
});

export const exportPdf = action({
	args: { 
		year: v.number(), 
		month: v.number(), 
		cdsGroupId: v.optional(v.id("cds_groups")),
		minAttendance: v.optional(v.number()),
		maxAttendance: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<{ html: string }> => {
		const rep = await ctx.runQuery(api.reports.monthlyReport, {
			year: args.year,
			month: args.month,
			cdsGroupId: args.cdsGroupId
		});
		
		// Create a map of group IDs to names
		const groupMap = new Map();
		for (const group of rep.groups) {
			groupMap.set(group._id, group.name);
		}
		
		// Filter data based on attendance count if specified
		let filteredData = rep.data;
		if (args.minAttendance !== undefined || args.maxAttendance !== undefined) {
			filteredData = rep.data.filter((row: any) => {
				const count = row.count;
				const minCheck = args.minAttendance === undefined || count >= args.minAttendance;
				const maxCheck = args.maxAttendance === undefined || count <= args.maxAttendance;
				return minCheck && maxCheck;
			});
		}
		
		// Generate HTML for PDF
		const monthNames = ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"];
		
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
		
		for (const row of filteredData as any[]) {
			const groupName = groupMap.get(row.cds_group_id) || "Unknown Group";
			html += `
				<tr>
					<td>${row.state_code}</td>
					<td>${row.name}</td>
					<td>${groupName}</td>
					<td>${row.count}</td>
					<td>${row.dates.join(", ")}</td>
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
		
		return { html };
	},
});
