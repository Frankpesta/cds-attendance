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

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();
    return user ?? null;
  },
});

export const login = mutation({
  args: { stateCode: v.string(), password: v.string(), deviceFingerprint: v.optional(v.string()) },
  handler: async (ctx, { stateCode, password, deviceFingerprint }) => {
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

    // Automatically unblock admins/super_admins if they were somehow blocked
    // They should never be restricted by device blocking
    if ((user.role === "admin" || user.role === "super_admin") && user.is_blocked === true) {
      await ctx.db.patch(user._id, {
        is_blocked: false,
        blocked_at: undefined,
        blocked_reason: undefined,
        updated_at: now,
      });
    }

    // Check if user is blocked (only for corps_member - admins/super_admins should not be blocked)
    if (user.is_blocked === true && user.role === "corps_member") {
      throw new Error("Your account has been blocked due to login from a different device. Please contact a super admin to unblock your account.");
    }
    
    // Device fingerprint validation - ONLY for corps_member role
    // Admins and super_admins can login from anywhere without restrictions
    if (user.role === "corps_member" && deviceFingerprint) {
      // If user has an allowed device fingerprint set
      if (user.allowed_device_fingerprint) {
        // Check if the current device matches the allowed device
        if (user.allowed_device_fingerprint !== deviceFingerprint) {
          // Different device detected - block the account
          await ctx.db.patch(user._id, {
            is_blocked: true,
            blocked_at: now,
            blocked_reason: "Login attempt from different device",
            updated_at: now,
          });
          throw new Error("Login from a different device detected. Your account has been blocked for security. Please contact a super admin to unblock your account.");
        }
      } else {
        // First login - set the device fingerprint as allowed
        await ctx.db.patch(user._id, {
          allowed_device_fingerprint: deviceFingerprint,
          updated_at: now,
        });
      }
    }

    // Create new session token
    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      user_id: user._id,
      session_token: token,
      created_at: now,
      last_active_at: now,
      expires_at: now + SESSION_TTL_MS,
      device_fingerprint: deviceFingerprint,
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

    // Check if user is blocked (only block corps_member - admins/super_admins should never be blocked)
    if (user.is_blocked === true && user.role === "corps_member") {
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
      is_blocked: false,
      blocked_at: undefined,
      blocked_reason: undefined,
      allowed_device_fingerprint: undefined,
    });

    // If user selected a CDS group, update their documentation record
    if (cds_group_id) {
      const cdsGroup = await ctx.db.get(cds_group_id);
      if (cdsGroup) {
        // Find documentation record with matching state_code
        const docRecord = await ctx.db
          .query("corp_member_docs")
          .filter((q) => q.and(
            q.eq(q.field("state_code"), state_code),
            q.eq(q.field("is_deleted"), false)
          ))
          .first();
        
        if (docRecord) {
          // Update the documentation record with the CDS group name
          await ctx.db.patch(docRecord._id, {
            cds: cdsGroup.name,
            updated_at: now,
          });
        }
      }
    }

    // Create session immediately after signup
    const token = crypto.randomUUID();
    await ctx.db.insert("sessions", {
      user_id: userId,
      session_token: token,
      created_at: now,
      last_active_at: now,
      expires_at: now + SESSION_TTL_MS,
      device_fingerprint: undefined, // Will be set on first login
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

export const requestPasswordReset = mutation({
  args: { stateCode: v.string(), email: v.string() },
  handler: async (ctx, { stateCode, email }) => {
    // Verify state code and email match
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("state_code"), stateCode))
      .unique();
    
    // Don't reveal if user exists for security - return generic message
    if (!user || user.email !== email) {
      return { success: false, error: "Invalid state code or email combination" };
    }

    const now = nowMs();
    const token = crypto.randomUUID();
    const expiresAt = now + 60 * 60 * 1000; // 1 hour

    // Invalidate any existing reset tokens for this user
    const existingTokens = await ctx.db
      .query("password_reset_tokens")
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .collect();
    
    for (const existingToken of existingTokens) {
      if (!existingToken.used_at && existingToken.expires_at > now) {
        await ctx.db.patch(existingToken._id, { used_at: now });
      }
    }

    // Create new reset token
    await ctx.db.insert("password_reset_tokens", {
      user_id: user._id,
      token,
      created_at: now,
      expires_at: expiresAt,
    });

    // Return token for immediate use (no email needed)
    return { success: true, token };
  },
});

export const validateResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const resetToken = await ctx.db
      .query("password_reset_tokens")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    
    if (!resetToken) {
      return { valid: false };
    }

    const now = nowMs();
    if (resetToken.used_at || resetToken.expires_at <= now) {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.user_id };
  },
});

export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, newPassword }) => {
    const resetToken = await ctx.db
      .query("password_reset_tokens")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    
    if (!resetToken) {
      throw new Error("Invalid or expired reset token");
    }

    const now = nowMs();
    if (resetToken.used_at || resetToken.expires_at <= now) {
      throw new Error("Invalid or expired reset token");
    }

    if (!passwordMeetsPolicy(newPassword)) {
      throw new Error(
        "Password must be at least 8 characters and include upper, lower, and number",
      );
    }

    const user = await ctx.db.get(resetToken.user_id);
    if (!user) {
      throw new Error("User not found");
    }

    // Update password
    const hashed = bcrypt.hashSync(newPassword, 10);
    await ctx.db.patch(user._id, {
      password: hashed,
      updated_at: now,
    });

    // Mark token as used
    await ctx.db.patch(resetToken._id, {
      used_at: now,
    });

    return { success: true };
  },
});


