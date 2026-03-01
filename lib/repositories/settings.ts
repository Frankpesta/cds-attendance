import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";
import { extractBatchFromStateCode } from "@/lib/server-utils";

async function getSettingValue(key: string): Promise<number | null> {
  const setting = await prisma.setting.findFirst({
    where: { key },
  });
  return setting ? parseInt(setting.value, 10) : null;
}

export async function getRequiredAttendanceCount(args?: {
  batch?: "A" | "B" | "C";
  stateCode?: string;
}) {
  let batch: "A" | "B" | "C" | null = args?.batch ?? null;
  if (!batch && args?.stateCode) {
    const extracted = extractBatchFromStateCode(args.stateCode);
    if (extracted && ["A", "B", "C"].includes(extracted)) {
      batch = extracted as "A" | "B" | "C";
    }
  }

  if (batch) {
    const batchKey = `required_attendance_per_month_batch_${batch}`;
    const batchValue = await getSettingValue(batchKey);
    if (batchValue !== null) return batchValue;
  }

  const defaultSetting = await getSettingValue("required_attendance_per_month");
  return defaultSetting !== null ? defaultSetting : 3;
}

export async function getBatchAttendanceSettings() {
  const defaultCount = await getSettingValue("required_attendance_per_month");
  const batchA = await getSettingValue("required_attendance_per_month_batch_A");
  const batchB = await getSettingValue("required_attendance_per_month_batch_B");
  const batchC = await getSettingValue("required_attendance_per_month_batch_C");

  return {
    default: defaultCount !== null ? defaultCount : 3,
    batchA,
    batchB,
    batchC,
  };
}

async function setSettingValue(
  key: string,
  value: string,
  userId: string,
): Promise<void> {
  const now = Date.now();
  const existing = await prisma.setting.findFirst({ where: { key } });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value, updated_by: userId, updated_at: BigInt(now) },
    });
  } else {
    await prisma.setting.create({
      data: {
        id: generateId(),
        key,
        value,
        updated_by: userId,
        updated_at: BigInt(now),
      },
    });
  }
}

export async function setRequiredAttendanceCount(
  sessionToken: string,
  count: number,
) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const user = session.user;
  if (!user || user.role !== "super_admin") throw new Error("Forbidden");

  if (count < 1) {
    throw new Error("Required attendance count must be at least 1");
  }

  await setSettingValue(
    "required_attendance_per_month",
    count.toString(),
    user.id,
  );
  return { success: true, count };
}

export async function setBatchAttendanceRequirements(
  sessionToken: string,
  args: {
    default: number;
    batchA?: number;
    batchB?: number;
    batchC?: number;
  },
) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const user = session.user;
  if (!user || user.role !== "super_admin") throw new Error("Forbidden");

  const { default: defaultCount, batchA, batchB, batchC } = args;
  if (defaultCount < 1) {
    throw new Error("Default attendance count must be at least 1");
  }
  if (batchA !== undefined && batchA < 1) {
    throw new Error("Batch A attendance count must be at least 1");
  }
  if (batchB !== undefined && batchB < 1) {
    throw new Error("Batch B attendance count must be at least 1");
  }
  if (batchC !== undefined && batchC < 1) {
    throw new Error("Batch C attendance count must be at least 1");
  }

  await setSettingValue(
    "required_attendance_per_month",
    defaultCount.toString(),
    user.id,
  );

  if (batchA !== undefined) {
    await setSettingValue(
      "required_attendance_per_month_batch_A",
      batchA.toString(),
      user.id,
    );
  } else {
    const existing = await prisma.setting.findFirst({
      where: { key: "required_attendance_per_month_batch_A" },
    });
    if (existing) await prisma.setting.delete({ where: { id: existing.id } });
  }

  if (batchB !== undefined) {
    await setSettingValue(
      "required_attendance_per_month_batch_B",
      batchB.toString(),
      user.id,
    );
  } else {
    const existing = await prisma.setting.findFirst({
      where: { key: "required_attendance_per_month_batch_B" },
    });
    if (existing) await prisma.setting.delete({ where: { id: existing.id } });
  }

  if (batchC !== undefined) {
    await setSettingValue(
      "required_attendance_per_month_batch_C",
      batchC.toString(),
      user.id,
    );
  } else {
    const existing = await prisma.setting.findFirst({
      where: { key: "required_attendance_per_month_batch_C" },
    });
    if (existing) await prisma.setting.delete({ where: { id: existing.id } });
  }

  return { success: true };
}
