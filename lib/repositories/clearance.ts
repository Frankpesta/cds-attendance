import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";
import crypto from "node:crypto";

export async function createClearanceVerification(
  userId: string,
  year: number,
  month: number,
): Promise<string> {
  const token = crypto.randomBytes(24).toString("hex");
  const id = generateId();
  const now = Date.now();

  await prisma.clearanceVerification.create({
    data: {
      id,
      token,
      user_id: userId,
      year,
      month,
      created_at: BigInt(now),
    },
  });

  return token;
}

export async function getClearanceVerificationByToken(token: string) {
  const record = await prisma.clearanceVerification.findUnique({
    where: { token },
  });
  return record;
}
