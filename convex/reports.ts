import { query, action } from "./_generated/server";
import { v } from "convex/values";

export const monthlyReport = query({
	args: {
		year: v.number(),
		month: v.number(), // 1-12
		cdsGroupId: v.optional(v.id("cds_groups")),
	},
	handler: async (ctx, { year, month, cdsGroupId }) => {
		const monthStr = String(month).padStart(2, "0");
		const start = `${year}-${monthStr}-01`;
		const end = `${year}-${monthStr}-31`;

		const groups = cdsGroupId
			? [await ctx.db.get(cdsGroupId)].filter(Boolean)
			: await ctx.db.query("cds_groups").collect();

		const groupIds = new Set(groups.map((g) => g!._id));

		const attendance = await ctx.db
			.query("attendance")
			.filter((q) => q.and(q.gte(q.field("meeting_date"), start), q.lte(q.field("meeting_date"), end)))
			.collect();

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
	args: { year: v.number(), month: v.number(), cdsGroupId: v.optional(v.id("cds_groups")) },
	handler: async (ctx, args) => {
		const rep = await ctx.runQuery(monthlyReport, args as any);
		const lines = ["State Code,Name,Group,Attendance Count,Dates"];
		for (const row of rep.data as any[]) {
			lines.push(
				`${row.state_code},${row.name},${row.cds_group_id},${row.count},"${row.dates.join(" ")}"`,
			);
		}
		return { csv: lines.join("\n") };
	},
});
