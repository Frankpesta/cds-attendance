import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";
import bcrypt from "bcryptjs";
import { formatStateCode, generateTempPassword, nowMs } from "./utils";

// Helper to ensure only super_admin or permitted admin can onboard
async function assertCanOnboard(ctx: any, actorUserId: string, targetGroupId: string) {
  const actor = await ctx.db.get(actorUserId as any);
  if (!actor) throw new Error("Unauthorized");
  if (actor.role === "super_admin") return;
  if (actor.role !== "admin") throw new Error("Forbidden");

  // Admin must be assigned to the group
  const assignment = await ctx.db
    .query("admin_group_assignments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("admin_id"), actor._id),
        q.eq(q.field("cds_group_id"), targetGroupId),
      ),
    )
    .first();
  if (!assignment) throw new Error("Forbidden: not assigned to this group");
}

// Generate next sequence number for state code by counting users
async function getNextSequence(ctx: any): Promise<number> {
  const total = await ctx.db.query("users").collect();
  return total.length + 1;
}

export const onboardCorpsMember = mutation({
  args: {
    actorSessionToken: v.string(),
    name: v.string(),
    email: v.string(),
    address: v.string(),
    ppa: v.string(),
    cds_group_id: v.id("cds_groups"),
    stateCode: v.string(), // e.g., "AK/24A/1234"
    batchCode: v.string(), // e.g., "24A"
    statePrefix: v.string(), // e.g., "AK"
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q: any) => q.eq(q.field("session_token"), args.actorSessionToken))
      .unique();
    if (!session) throw new Error("Unauthorized");
    const actor = await ctx.db.get(session.user_id);
    if (!actor) throw new Error("Unauthorized");

    await assertCanOnboard(ctx, actor._id, args.cds_group_id);

    // Unique email check
    const existingByEmail = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .unique();
    if (existingByEmail) {
      throw new Error(
        `A user with this email already exists. State Code: ${existingByEmail.state_code}`,
      );
    }

    // Use provided state code or generate one
    const stateCode = args.stateCode || formatStateCode(args.statePrefix, args.batchCode, await getNextSequence(ctx));
    const tempPassword = generateTempPassword(12);
    const hashed = bcrypt.hashSync(tempPassword, 10);
    const now = nowMs();

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      address: args.address,
      ppa: args.ppa,
      state_code: stateCode,
      password: hashed,
      role: "corps_member",
      cds_group_id: args.cds_group_id,
      cds_meeting_days: [], // can be synced from group client-side
      must_change_password: true,
      is_ip_banned: false,
      created_at: now,
      updated_at: now,
    });

    // Fire-and-forget email via action
    await ctx.scheduler.runAfter(0, api.email.sendOnboardingEmail, {
      to: args.email,
      name: args.name,
      stateCode,
      tempPassword,
      loginUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    });

    // Audit
    await ctx.db.insert("audit_logs", {
      actor_user_id: actor._id,
      action: "onboard_corps_member",
      details: JSON.stringify({ userId, email: args.email, stateCode }),
      created_at: now,
    });

    return { userId, stateCode };
  },
});


