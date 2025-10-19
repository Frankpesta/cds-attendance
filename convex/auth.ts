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
  args: { stateCode: v.string(), password: v.string(), clientIp: v.optional(v.string()) },
  handler: async (ctx, { stateCode, password, clientIp }) => {
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

    // IP-based security check
    if (clientIp) {
      // If user has a registered IP and it doesn't match, check if they're banned
      if (user.registered_ip && user.registered_ip !== clientIp) {
        if (user.is_ip_banned) {
          throw new Error("Your account has been temporarily locked due to IP address mismatch. Please contact a Super Admin to unlock your account.");
        }
        // First time login from different IP - ban the user
        await ctx.db.patch(user._id, {
          is_ip_banned: true,
          updated_at: nowMs(),
        });
        throw new Error("Your account has been temporarily locked due to IP address mismatch. Please contact a Super Admin to unlock your account.");
      }
      
      // If this is the first login or IP matches, register the IP
      if (!user.registered_ip) {
        await ctx.db.patch(user._id, {
          registered_ip: clientIp,
          updated_at: nowMs(),
        });
      }
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
        must_change_password: user.must_change_password,
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
      must_change_password: false,
      updated_at: nowMs(),
    });
    return true;
  },
});

export const unbanUser = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { sessionToken, userId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("session_token"), sessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");

    const admin = await ctx.db.get(session.user_id);
    if (!admin || admin.role !== "super_admin") {
      throw new Error("Only Super Admins can unban users");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userId, {
      is_ip_banned: false,
      updated_at: nowMs(),
    });

    return true;
  },
});

export const getBannedUsers = query({
  args: {},
  handler: async (ctx) => {
    const bannedUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("is_ip_banned"), true))
      .collect();

    return bannedUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      state_code: user.state_code,
      registered_ip: user.registered_ip,
      role: user.role,
      created_at: user.created_at,
    }));
  },
});


