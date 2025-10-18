import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { nowMs } from "./utils";

export const superAdminsExist = query({
  args: {},
  handler: async (ctx) => {
    const supers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .collect();
    return supers.length > 0;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .unique();
    return existing ?? null;
  },
});

export const createSuperAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    stateCode: v.string(),
  },
  handler: async (ctx, { name, email, passwordHash, stateCode }) => {
    const now = nowMs();
    const id = await ctx.db.insert("users", {
      name,
      email,
      address: "",
      ppa: "",
      state_code: stateCode,
      password: passwordHash,
      role: "super_admin",
      cds_group_id: undefined,
      cds_meeting_days: [],
      must_change_password: false,
      created_at: now,
      updated_at: now,
    });
    return id;
  },
});

export const seedSuperAdmin = action({
  args: {
    secret: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    stateCode: v.string(),
  },
  handler: async (ctx, { secret, name, email, password, stateCode }) => {
    // Allow seeding without secret only if no super admin exists yet
    const firstTimeBootstrap = !(await superAdminsExist(ctx, {}));
    if (!firstTimeBootstrap && secret !== process.env.SESSION_SECRET) {
      throw new Error("Unauthorized");
    }
    const exists = await getUserByEmail(ctx, { email });
    if (exists) return { ok: false, error: "User exists" } as const;
    const hashed = bcrypt.hashSync(password, 10);
    const id = await createSuperAdmin(ctx, {
      name,
      email,
      passwordHash: hashed,
      stateCode,
    });
    return { ok: true, id } as const;
  },
});


