import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowMs, passwordMeetsPolicy } from "./utils";
import bcrypt from "bcryptjs";

// ENV configuration (Convex actions can read environment variables)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h inactivity expiry
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days absolute

export const getUserByStateCode = query({
  args: { stateCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("state_code"), args.stateCode))
      .unique();
    return user ?? null;
  },
});

export const login = mutation({
  args: { stateCode: v.string(), password: v.string() },
  handler: async (ctx, { stateCode, password }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("state_code"), stateCode))
      .unique();
    if (!user) {
      throw new Error("Invalid state code or password");
    }

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) {
      throw new Error("Invalid state code or password");
    }

    const now = nowMs();
    // Invalidate old sessions for this user that are expired
    // Note: avoid deletes in queries; just create a fresh session

    // Create new session token
    const token = crypto.randomUUID();
    const sessionId = await ctx.db.insert("sessions", {
      user_id: user._id,
      session_token: token,
      created_at: now,
      last_active_at: now,
      expires_at: now + SESSION_TTL_MS,
    });

    return {
      sessionToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
});

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return null;

    const now = nowMs();
    if (session.expires_at <= now || now - session.created_at > SESSION_MAX_AGE_MS) {
      return null;
    }

    const user = await ctx.db.get(session.user_id);
    if (!user) {
      return null;
    }
    return { session, user };
  },
});

export const refreshSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return null;
    const now = nowMs();
    if (session.expires_at <= now || now - session.created_at > SESSION_MAX_AGE_MS) {
      return null;
    }
    await ctx.db.patch(session._id, {
      last_active_at: now,
      expires_at: now + SESSION_TTL_MS,
    });
    return true;
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) return false;
    // Replace with a soft logout by expiring immediately
    await ctx.db.patch(session._id, { expires_at: nowMs() });
    return true;
  },
});

export const signup = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    state_code: v.string(),
    password: v.string(),
    cds_group_id: v.optional(v.id("cds_groups")),
  },
  handler: async (ctx, { name, email, state_code, password, cds_group_id }) => {
    // Validate password
    if (!passwordMeetsPolicy(password)) {
      throw new Error(
        "Password must be at least 8 characters and include upper, lower, and number",
      );
    }

    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    
    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // Check if state code already exists
    const existingStateCode = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("state_code"), state_code))
      .first();
    
    if (existingStateCode) {
      throw new Error("A user with this state code already exists");
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = nowMs();

    const userId = await ctx.db.insert("users", {
      name,
      email,
      state_code,
      password: hashedPassword,
      role: "corps_member",
      cds_group_id,
      created_at: now,
      updated_at: now,
    });

    // Create session immediately after signup
    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      user_id: userId,
      session_token: token,
      created_at: now,
      last_active_at: now,
      expires_at: now + SESSION_TTL_MS,
    });

    return {
      sessionToken: token,
      user: {
        id: userId,
        name,
        email,
        role: "corps_member",
      },
    };
  },
});

export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { sessionToken, currentPassword, newPassword }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");

    const user = await ctx.db.get(session.user_id);
    if (!user) throw new Error("Unauthorized");

    const same = bcrypt.compareSync(currentPassword, user.password);
    if (!same) throw new Error("Current password is incorrect");

    if (!passwordMeetsPolicy(newPassword)) {
      throw new Error(
        "Password must be at least 8 characters and include upper, lower, and number",
      );
    }

    const isDifferent = !bcrypt.compareSync(newPassword, user.password);
    if (!isDifferent) throw new Error("New password must be different from current password");

    const hashed = bcrypt.hashSync(newPassword, 10);
    await ctx.db.patch(user._id, {
      password: hashed,
      updated_at: nowMs(),
    });
    return true;
  },
});


