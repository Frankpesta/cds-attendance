import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { nowMs, passwordMeetsPolicy } from "@/lib/server-utils";
import { generateId } from "@/lib/id";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserByStateCode(stateCode: string) {
  return prisma.user.findFirst({ where: { state_code: stateCode } });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email } });
}

export async function login(stateCode: string, password: string, deviceFingerprint?: string) {
  const user = await prisma.user.findFirst({ where: { state_code: stateCode } });
  if (!user) throw new Error("Invalid state code or password");

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) throw new Error("Invalid state code or password");

  const now = Number(nowMs());

  if ((user.role === "admin" || user.role === "super_admin") && user.is_blocked === true) {
    await prisma.user.update({
      where: { id: user.id },
      data: { is_blocked: false, blocked_at: null, blocked_reason: null, updated_at: BigInt(now) },
    });
  }

  if (user.role === "corps_member" && user.is_blocked === true) {
    await prisma.user.update({
      where: { id: user.id },
      data: { is_blocked: false, blocked_at: null, blocked_reason: null, updated_at: BigInt(now) },
    });
  }

  if (user.role === "corps_member" && deviceFingerprint) {
    await prisma.user.update({
      where: { id: user.id },
      data: { allowed_device_fingerprint: deviceFingerprint, updated_at: BigInt(now) },
    });
  }

  const token = crypto.randomUUID();
  const sessionId = generateId();
  await prisma.session.create({
    data: {
      id: sessionId,
      user_id: user.id,
      session_token: token,
      created_at: BigInt(now),
      last_active_at: BigInt(now),
      expires_at: BigInt(now + SESSION_TTL_MS),
      device_fingerprint: deviceFingerprint ?? null,
    },
  });

  return {
    sessionToken: token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) return null;

  const now = nowMs();
  if (Number(session.expires_at) <= now || now - Number(session.created_at) > SESSION_MAX_AGE_MS) {
    return null;
  }
  return {
    session: {
      ...session,
      created_at: Number(session.created_at),
      last_active_at: Number(session.last_active_at),
      expires_at: Number(session.expires_at),
    },
    user: {
      ...session.user,
      created_at: Number(session.user.created_at),
      updated_at: Number(session.user.updated_at),
      blocked_at: session.user.blocked_at != null ? Number(session.user.blocked_at) : null,
    },
  };
}

export async function refreshSession(sessionToken: string) {
  const session = await prisma.session.findUnique({ where: { session_token: sessionToken } });
  if (!session) return null;

  const now = nowMs();
  if (Number(session.expires_at) <= now || now - Number(session.created_at) > SESSION_MAX_AGE_MS) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { last_active_at: BigInt(now), expires_at: BigInt(now + SESSION_TTL_MS) },
  });
  return true;
}

export async function logout(sessionToken: string) {
  const session = await prisma.session.findUnique({ where: { session_token: sessionToken } });
  if (!session) return false;

  await prisma.session.update({
    where: { id: session.id },
    data: { expires_at: BigInt(nowMs()) },
  });
  return true;
}

export async function signup(
  name: string,
  email: string,
  state_code: string,
  password: string,
  cds_group_id?: string,
) {
  if (!passwordMeetsPolicy(password)) {
    throw new Error("Password must be at least 8 characters and include upper, lower, and number");
  }

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) throw new Error("A user with this email already exists");

  const existingStateCode = await prisma.user.findFirst({ where: { state_code } });
  if (existingStateCode) throw new Error("A user with this state code already exists");

  const hashedPassword = bcrypt.hashSync(password, 10);
  const now = nowMs();
  const userId = generateId();

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      state_code,
      password: hashedPassword,
      role: "corps_member",
      cds_group_id: cds_group_id ?? null,
      created_at: BigInt(now),
      updated_at: BigInt(now),
      is_blocked: false,
    },
  });

  if (cds_group_id) {
    const cdsGroup = await prisma.cdsGroup.findUnique({ where: { id: cds_group_id } });
    if (cdsGroup) {
      const docRecord = await prisma.corpMemberDoc.findFirst({
        where: { state_code, is_deleted: false },
      });
      if (docRecord) {
        await prisma.corpMemberDoc.update({
          where: { id: docRecord.id },
          data: { cds: cdsGroup.name, updated_at: BigInt(now) },
        });
      }
    }
  }

  const token = crypto.randomUUID();
  const sessionId = generateId();
  await prisma.session.create({
    data: {
      id: sessionId,
      user_id: userId,
      session_token: token,
      created_at: BigInt(now),
      last_active_at: BigInt(now),
      expires_at: BigInt(now + SESSION_TTL_MS),
    },
  });

  return {
    sessionToken: token,
    user: { id: userId, name, email, role: "corps_member" as const },
  };
}

export async function changePassword(
  sessionToken: string,
  currentPassword: string,
  newPassword: string,
) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");

  const user = session.user;
  const same = bcrypt.compareSync(currentPassword, user.password);
  if (!same) throw new Error("Current password is incorrect");

  if (!passwordMeetsPolicy(newPassword)) {
    throw new Error("Password must be at least 8 characters and include upper, lower, and number");
  }

  if (!bcrypt.compareSync(newPassword, user.password)) {
    throw new Error("New password must be different from current password");
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, updated_at: BigInt(nowMs()) },
  });
  return true;
}

export async function requestPasswordReset(stateCode: string, email: string) {
  const user = await prisma.user.findFirst({ where: { state_code: stateCode } });
  if (!user || user.email !== email) {
    return { success: false, error: "Invalid state code or email combination" };
  }

  const now = nowMs();
  const token = crypto.randomUUID();
  const expiresAt = now + 60 * 60 * 1000;

  const existingTokens = await prisma.passwordResetToken.findMany({
    where: { user_id: user.id },
  });
  for (const t of existingTokens) {
    if (!t.used_at && Number(t.expires_at) > now) {
      await prisma.passwordResetToken.update({
        where: { id: t.id },
        data: { used_at: BigInt(now) },
      });
    }
  }

  const tokenId = generateId();
  await prisma.passwordResetToken.create({
    data: {
      id: tokenId,
      user_id: user.id,
      token,
      created_at: BigInt(now),
      expires_at: BigInt(expiresAt),
    },
  });

  return { success: true, token };
}

export async function validateResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { token },
  });
  if (!resetToken) return { valid: false };

  const now = nowMs();
  if (resetToken.used_at || Number(resetToken.expires_at) <= now) {
    return { valid: false };
  }
  return { valid: true, userId: resetToken.user_id };
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { token },
    include: { user: true },
  });
  if (!resetToken) throw new Error("Invalid or expired reset token");

  const now = nowMs();
  if (resetToken.used_at || Number(resetToken.expires_at) <= now) {
    throw new Error("Invalid or expired reset token");
  }

  if (!passwordMeetsPolicy(newPassword)) {
    throw new Error("Password must be at least 8 characters and include upper, lower, and number");
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({
    where: { id: resetToken.user_id },
    data: { password: hashed, updated_at: BigInt(now) },
  });

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used_at: BigInt(now) },
  });

  return { success: true };
}
