import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const data = await ctx.db.query("cds_groups").collect();
    return data;
  },
});

export const get = query({
  args: { id: v.id("cds_groups") },
  handler: async (ctx, { id }) => {
    const group = await ctx.db.get(id);
    if (!group) return null;
    
    return {
      _id: group._id,
      name: group.name,
      meeting_days: group.meeting_days,
      meeting_time: group.meeting_time,
      meeting_duration: group.meeting_duration,
      venue_name: group.venue_name,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    meeting_days: v.array(v.string()),
    meeting_time: v.string(),
    meeting_duration: v.number(),
    venue_name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("cds_groups", {
      name: args.name,
      meeting_days: args.meeting_days,
      meeting_time: args.meeting_time,
      meeting_duration: args.meeting_duration,
      venue_name: args.venue_name,
      admin_ids: [],
      created_at: now,
      updated_at: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("cds_groups"),
    name: v.optional(v.string()),
    meeting_days: v.optional(v.array(v.string())),
    meeting_time: v.optional(v.string()),
    meeting_duration: v.optional(v.number()),
    venue_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    await ctx.db.patch(id, {
      ...updates,
      updated_at: now,
    });

    return id;
  },
});

export const deleteGroup = mutation({
  args: { id: v.id("cds_groups") },
  handler: async (ctx, { id }) => {
    // Check if group exists
    const group = await ctx.db.get(id);
    if (!group) {
      throw new Error("Group not found");
    }

    // Delete group's attendance records
    const attendance = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("cds_group_id"), id))
      .collect();
    
    for (const record of attendance) {
      await ctx.db.delete(record._id);
    }

    // Delete admin group assignments
    const assignments = await ctx.db
      .query("admin_group_assignments")
      .filter((q) => q.eq(q.field("cds_group_id"), id))
      .collect();
    
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete the group
    await ctx.db.delete(id);

    return id;
  },
});


