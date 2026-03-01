import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";

export async function listUsers() {
  const users = await prisma.user.findMany({
    take: 5000,
    select: {
      id: true,
      name: true,
      email: true,
      state_code: true,
      role: true,
      created_at: true,
      updated_at: true,
      is_blocked: true,
      blocked_at: true,
      blocked_reason: true,
    },
  });
  return users.map((user) => {
    const isBlocked = user.is_blocked === true || (user.blocked_at != null);
    return {
      _id: user.id,
      name: user.name,
      email: user.email,
      state_code: user.state_code,
      role: user.role,
      created_at: Number(user.created_at),
      updated_at: Number(user.updated_at),
      is_blocked: isBlocked,
      blocked_at: user.blocked_at ? Number(user.blocked_at) : undefined,
      blocked_reason: user.blocked_reason ?? undefined,
    };
  });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    state_code: user.state_code,
    role: user.role,
    cds_group_id: user.cds_group_id,
    created_at: Number(user.created_at),
    updated_at: Number(user.updated_at),
  };
}

export async function createUser(args: {
  name: string;
  email: string;
  state_code: string;
  role: "super_admin" | "admin" | "corps_member";
  password: string;
  cds_group_id?: string;
}) {
  const existingUser = await prisma.user.findFirst({ where: { email: args.email } });
  if (existingUser) throw new Error("A user with this email already exists");

  const existingStateCode = await prisma.user.findFirst({ where: { state_code: args.state_code } });
  if (existingStateCode) throw new Error("A user with this state code already exists");

  const hashedPassword = bcrypt.hashSync(args.password, 10);
  const now = Date.now();
  const userId = generateId();

  await prisma.user.create({
    data: {
      id: userId,
      name: args.name,
      email: args.email,
      state_code: args.state_code,
      role: args.role,
      password: hashedPassword,
      cds_group_id: args.cds_group_id ?? null,
      created_at: BigInt(now),
      updated_at: BigInt(now),
    },
  });

  return userId;
}

export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    state_code?: string;
    role?: "super_admin" | "admin" | "corps_member";
    cds_group_id?: string;
  },
) {
  if (updates.email) {
    const existing = await prisma.user.findFirst({
      where: { email: updates.email, NOT: { id } },
    });
    if (existing) throw new Error("A user with this email already exists");
  }
  if (updates.state_code) {
    const existing = await prisma.user.findFirst({
      where: { state_code: updates.state_code, NOT: { id } },
    });
    if (existing) throw new Error("A user with this state code already exists");
  }

  const now = Date.now();
  await prisma.user.update({
    where: { id },
    data: { ...updates, updated_at: BigInt(now) },
  });
  return id;
}

export async function deleteUser(sessionToken: string, userId: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const currentUser = session.user;
  if (currentUser.role !== "super_admin") throw new Error("Forbidden: Super admin access required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (user.role === "super_admin") {
    const superAdmins = await prisma.user.count({ where: { role: "super_admin" } });
    if (superAdmins <= 1) throw new Error("Cannot delete the last super admin");
  }

  await prisma.session.deleteMany({ where: { user_id: userId } });
  await prisma.attendance.deleteMany({ where: { user_id: userId } });
  await prisma.adminGroupAssignment.deleteMany({ where: { admin_id: userId } });
  await prisma.auditLog.deleteMany({ where: { actor_user_id: userId } });
  await prisma.passwordResetToken.deleteMany({ where: { user_id: userId } });
  await prisma.clearanceVerification.deleteMany({ where: { user_id: userId } });
  await prisma.user.delete({ where: { id: userId } });

  return userId;
}

export async function batchDeleteUsers(
  sessionToken: string,
  userIds: string[],
): Promise<{ deleted: number; errors: string[] }> {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "super_admin") {
    throw new Error("Forbidden: Super admin access required");
  }

  const errors: string[] = [];
  let deleted = 0;

  for (const userId of userIds) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        errors.push(`User ${userId} not found`);
        continue;
      }
      if (user.role === "super_admin") {
        const superAdmins = await prisma.user.count({ where: { role: "super_admin" } });
        if (superAdmins <= 1) {
          errors.push(`Cannot delete ${user.name}: last super admin`);
          continue;
        }
      }

      await prisma.session.deleteMany({ where: { user_id: userId } });
      await prisma.attendance.deleteMany({ where: { user_id: userId } });
      await prisma.adminGroupAssignment.deleteMany({ where: { admin_id: userId } });
      await prisma.auditLog.deleteMany({ where: { actor_user_id: userId } });
      await prisma.passwordResetToken.deleteMany({ where: { user_id: userId } });
      await prisma.clearanceVerification.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { id: userId } });
      deleted++;
    } catch (e) {
      errors.push(`Failed to delete ${userId}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return { deleted, errors };
}

export async function changeUserPassword(id: string, newPassword: string) {
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword, updated_at: BigInt(Date.now()) },
  });
  return id;
}

export async function getUsersWithoutCdsGroup() {
  const users = await prisma.user.findMany({
    where: { role: "corps_member", cds_group_id: null },
  });
  return users;
}

export async function assignCdsGroup(userId: string, cdsGroupId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "corps_member") throw new Error("Only corps members can be assigned to CDS groups");

  const cdsGroup = await prisma.cdsGroup.findUnique({ where: { id: cdsGroupId } });
  if (!cdsGroup) throw new Error("CDS group not found");

  await prisma.user.update({
    where: { id: userId },
    data: { cds_group_id: cdsGroupId, updated_at: BigInt(Date.now()) },
  });
  return { success: true };
}

export async function blockUser(userId: string, reason: string) {
  const now = Date.now();
  await prisma.user.update({
    where: { id: userId },
    data: {
      is_blocked: true,
      blocked_at: BigInt(now),
      blocked_reason: reason,
      updated_at: BigInt(now),
    },
  });
  return { success: true };
}

export async function unblockUser(
  sessionToken: string,
  userId: string,
  allowAnyDevice?: boolean,
) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "super_admin") throw new Error("Forbidden: Super admin access required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const now = Date.now();
  const updates: Record<string, unknown> = {
    is_blocked: false,
    blocked_at: null,
    blocked_reason: null,
    updated_at: BigInt(now),
  };
  if (allowAnyDevice) {
    updates.allowed_device_fingerprint = null;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updates as Parameters<typeof prisma.user.update>[0]["data"],
  });
  return { success: true };
}
