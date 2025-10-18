import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      state_code: user.state_code,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      // Don't return sensitive data
    }));
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (!user) return null;
    
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      state_code: user.state_code,
      role: user.role,
      address: user.address,
      ppa: user.ppa,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    state_code: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("corps_member")),
    password: v.string(),
    address: v.optional(v.string()),
    ppa: v.optional(v.string()),
    cds_group_id: v.optional(v.id("cds_groups")),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // Check if state code already exists
    const existingStateCode = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("state_code"), args.state_code))
      .first();
    
    if (existingStateCode) {
      throw new Error("A user with this state code already exists");
    }

    const hashedPassword = bcrypt.hashSync(args.password, 10);
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      state_code: args.state_code,
      role: args.role,
      password_hash: hashedPassword,
      address: args.address || "",
      ppa: args.ppa || "",
      cds_group_id: args.cds_group_id,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    });

    return userId;
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    state_code: v.optional(v.string()),
    role: v.optional(v.union(v.literal("super_admin"), v.literal("admin"), v.literal("corps_member"))),
    address: v.optional(v.string()),
    ppa: v.optional(v.string()),
    cds_group_id: v.optional(v.id("cds_groups")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Check if email already exists (if being updated)
    if (updates.email) {
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), updates.email))
        .filter((q) => q.neq(q.field("_id"), id))
        .first();
      
      if (existingUser) {
        throw new Error("A user with this email already exists");
      }
    }

    // Check if state code already exists (if being updated)
    if (updates.state_code) {
      const existingStateCode = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("state_code"), updates.state_code))
        .filter((q) => q.neq(q.field("_id"), id))
        .first();
      
      if (existingStateCode) {
        throw new Error("A user with this state code already exists");
      }
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      ...updates,
      updated_at: now,
    });

    return id;
  },
});

export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    // Check if user exists
    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow deleting the last super admin
    if (user.role === "super_admin") {
      const superAdmins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "super_admin"))
        .collect();
      
      if (superAdmins.length <= 1) {
        throw new Error("Cannot delete the last super admin");
      }
    }

    // Delete user's sessions
    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("user_id"), id))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete user's attendance records
    const attendance = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("user_id"), id))
      .collect();
    
    for (const record of attendance) {
      await ctx.db.delete(record._id);
    }

    // Delete the user
    await ctx.db.delete(id);

    return id;
  },
});

export const changePassword = mutation({
  args: {
    id: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, { id, newPassword }) => {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const now = Date.now();

    await ctx.db.patch(id, {
      password: hashedPassword,
      must_change_password: false,
      updated_at: now,
    });

    return id;
  },
});

