import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("admin_group_assignments").collect();
    
    return assignments.map(assignment => ({
      _id: assignment._id,
      admin_id: assignment.admin_id,
      cds_group_id: assignment.cds_group_id,
      created_at: assignment.created_at,
    }));
  },
});

export const create = mutation({
  args: {
    admin_id: v.id("users"),
    cds_group_id: v.id("cds_groups"),
  },
  handler: async (ctx, args) => {
    // Check if assignment already exists
    const existing = await ctx.db
      .query("admin_group_assignments")
      .filter((q) => 
        q.and(
          q.eq(q.field("admin_id"), args.admin_id),
          q.eq(q.field("cds_group_id"), args.cds_group_id)
        )
      )
      .first();

    if (existing) {
      throw new Error("Admin is already assigned to this group");
    }

    // Verify admin exists and has admin role
    const admin = await ctx.db.get(args.admin_id);
    if (!admin || admin.role !== "admin") {
      throw new Error("Invalid admin user");
    }

    // Verify group exists
    const group = await ctx.db.get(args.cds_group_id);
    if (!group) {
      throw new Error("Invalid CDS group");
    }

    const id = await ctx.db.insert("admin_group_assignments", {
      admin_id: args.admin_id,
      cds_group_id: args.cds_group_id,
      created_at: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("admin_group_assignments") },
  handler: async (ctx, { id }) => {
    const assignment = await ctx.db.get(id);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    await ctx.db.delete(id);
    return id;
  },
});

export const getByAdmin = query({
  args: { admin_id: v.id("users") },
  handler: async (ctx, { admin_id }) => {
    const assignments = await ctx.db
      .query("admin_group_assignments")
      .filter((q) => q.eq(q.field("admin_id"), admin_id))
      .collect();

    return assignments.map(assignment => ({
      _id: assignment._id,
      admin_id: assignment.admin_id,
      cds_group_id: assignment.cds_group_id,
      created_at: assignment.created_at,
    }));
  },
});

export const getByGroup = query({
  args: { cds_group_id: v.id("cds_groups") },
  handler: async (ctx, { cds_group_id }) => {
    const assignments = await ctx.db
      .query("admin_group_assignments")
      .filter((q) => q.eq(q.field("cds_group_id"), cds_group_id))
      .collect();

    return assignments.map(assignment => ({
      _id: assignment._id,
      admin_id: assignment.admin_id,
      cds_group_id: assignment.cds_group_id,
      created_at: assignment.created_at,
    }));
  },
});
