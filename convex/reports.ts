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
    maxAttendance: v.optional(v.number()),
    stateCode: v.optional(v.string())
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
			if (group) {
				groupMap.set(group._id, group.name);
			}
		}
		
		// Filter data based on attendance count and state code if specified
		let filteredData = rep.data;
		if (args.minAttendance !== undefined || args.maxAttendance !== undefined || args.stateCode) {
			filteredData = rep.data.filter((row: any) => {
				const count = row.count;
				const minCheck = args.minAttendance === undefined || count >= args.minAttendance;
				const maxCheck = args.maxAttendance === undefined || count <= args.maxAttendance;
				const stateCheck = !args.stateCode || row.state_code?.includes(args.stateCode);
				return minCheck && maxCheck && stateCheck;
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
    maxAttendance: v.optional(v.number()),
    stateCode: v.optional(v.string())
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
			if (group) {
				groupMap.set(group._id, group.name);
			}
		}
		
		// Filter data based on attendance count and state code if specified
		let filteredData = rep.data;
		if (args.minAttendance !== undefined || args.maxAttendance !== undefined || args.stateCode) {
			filteredData = rep.data.filter((row: any) => {
				const count = row.count;
				const minCheck = args.minAttendance === undefined || count >= args.minAttendance;
				const maxCheck = args.maxAttendance === undefined || count <= args.maxAttendance;
				const stateCheck = !args.stateCode || row.state_code?.includes(args.stateCode);
				return minCheck && maxCheck && stateCheck;
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

export const exportUserPdf = action({
  args: { 
    userId: v.id("users"),
    year: v.number(), 
    month: v.number()
  },
  handler: async (ctx, args): Promise<{ html: string }> => {
		const rep = await ctx.runQuery(api.reports.monthlyReport, {
			year: args.year,
			month: args.month,
			userId: args.userId
		});
		
		// Get user details using a query
		const user = await ctx.runQuery(api.users.get, { id: args.userId });
		if (!user) {
			throw new Error("User not found");
		}
		
		// Get CDS group details
		let cdsGroupName = "Not Assigned";
		if (user.cds_group_id) {
			const cdsGroup = await ctx.runQuery(api.cds_groups.get, { id: user.cds_group_id });
			if (cdsGroup) {
				cdsGroupName = cdsGroup.name;
			}
		}
		
		// Calculate statistics
		const totalRecords = rep.data.length;
		const totalAttendance = rep.data.reduce((sum, row) => sum + (row.count || 0), 0);
		const averageAttendance = totalRecords > 0 ? ((totalAttendance / totalRecords) * 100).toFixed(2) : 0;
		const isCleared = totalAttendance >= totalRecords;
		
		// Generate HTML for PDF
		const monthNames = ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"];
		
		const monthName = monthNames[args.month - 1];
		
		let html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>CDS Clearance Certificate - ${user.name}</title>
				<style>
					@media print {
						body { margin: 0; }
						.page-break { page-break-before: always; }
					}
					
					body { 
						font-family: Arial, sans-serif; 
						margin: 20px; 
						line-height: 1.6;
						color: #000;
						background: white;
					}
					
					.header { 
						text-align: center; 
						margin-bottom: 30px; 
						border-bottom: 3px solid #000;
						padding-bottom: 20px;
					}
					
					.header h1 { 
						color: #000; 
						margin: 0; 
						font-size: 24px;
						font-weight: bold;
					}
					
					.header p { 
						color: #000; 
						margin: 10px 0 0 0; 
						font-size: 16px;
					}
					
					.certificate { 
						border: 2px solid #000; 
						padding: 20px; 
						margin: 20px 0;
					}
					
					.user-info { 
						padding: 15px; 
						margin: 15px 0;
						border: 1px solid #000;
					}
					
					.user-info h3 { 
						color: #000; 
						margin: 0 0 15px 0; 
						font-size: 16px;
						font-weight: bold;
					}
					
					.info-row { 
						margin: 8px 0; 
						padding: 5px 0;
						border-bottom: 1px solid #ccc;
						overflow: hidden;
					}
					
					.info-label { 
						font-weight: bold; 
						color: #000; 
						width: 150px;
						float: left;
					}
					
					.info-value { 
						color: #000; 
						margin-left: 160px;
					}
					
					.stats { 
						margin: 20px 0;
						overflow: hidden;
					}
					
					.stat-card { 
						padding: 15px; 
						text-align: center;
						border: 1px solid #000;
						width: 30%;
						float: left;
						margin-right: 3%;
					}
					
					.stat-card:last-child {
						margin-right: 0;
					}
					
					.stat-number { 
						font-size: 20px; 
						font-weight: bold; 
						color: #000; 
						margin-bottom: 5px;
					}
					
					.stat-label { 
						color: #000; 
						font-size: 12px;
					}
					
					.status { 
						text-align: center; 
						margin: 30px 0; 
						padding: 20px; 
						border: 2px solid #000;
						background: ${isCleared ? '#f0f0f0' : '#f5f5f5'};
					}
					
					.status-icon { 
						font-size: 20px; 
						margin-bottom: 10px;
					}
					
					.status-text { 
						font-size: 16px; 
						font-weight: bold; 
						color: #000;
					}
					
					.footer { 
						text-align: center; 
						margin-top: 40px; 
						padding-top: 20px; 
						border-top: 1px solid #000; 
						color: #000; 
						font-size: 12px;
					}
					
					.attendance-dates {
						padding: 15px;
						margin: 15px 0;
						border: 1px solid #000;
					}
					
					.attendance-dates h4 {
						color: #000;
						margin: 0 0 10px 0;
						font-size: 14px;
						font-weight: bold;
					}
					
					.date-list {
						line-height: 1.8;
					}
					
					.date-tag {
						background: #f0f0f0;
						color: #000;
						padding: 2px 6px;
						border: 1px solid #000;
						font-size: 10px;
						font-weight: normal;
						margin-right: 5px;
						display: inline-block;
						margin-bottom: 3px;
					}
					
					.clearfix::after {
						content: "";
						display: table;
						clear: both;
					}
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
						<div class="info-row">
							<span class="info-label">Full Name:</span>
							<span class="info-value">${user.name}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Email Address:</span>
							<span class="info-value">${user.email}</span>
						</div>
						<div class="info-row">
							<span class="info-label">State Code:</span>
							<span class="info-value">${user.state_code}</span>
						</div>
						<div class="info-row">
							<span class="info-label">CDS Group:</span>
							<span class="info-value">${cdsGroupName}</span>
						</div>
					</div>
					
					<div class="stats clearfix">
						<div class="stat-card">
							<div class="stat-number">${totalRecords}</div>
							<div class="stat-label">Total CDS Sessions</div>
						</div>
						<div class="stat-card">
							<div class="stat-number">${totalAttendance}</div>
							<div class="stat-label">Times Attended</div>
						</div>
						<div class="stat-card">
							<div class="stat-number">${averageAttendance}%</div>
							<div class="stat-label">Attendance Rate</div>
						</div>
					</div>
					
					${rep.data.length > 0 ? `
					<div class="attendance-dates">
						<h4>Attendance Dates</h4>
						<div class="date-list">
							${rep.data.map((row: any) => 
								row.dates.map((date: string) => 
									`<span class="date-tag">${date}</span>`
								).join('')
							).join('')}
						</div>
					</div>
					` : ''}
					
					<div class="status">
						<div class="status-icon">${isCleared ? '✅' : '⚠️'}</div>
						<div class="status-text">
							${isCleared 
								? 'CLEARED - Attendance requirement met (100% required)' 
								: 'PENDING - Attendance requirement not met (100% required)'
							}
						</div>
					</div>
				</div>
				
				<div class="footer">
					<p><strong>CDS Attendance Management System</strong></p>
					<p>This certificate is generated automatically and can be verified by administrators</p>
					<p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
				</div>
			</body>
			</html>
		`;
		
		return { html };
	},
});
