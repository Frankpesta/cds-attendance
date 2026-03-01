import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";

export async function listCdsGroups() {
  const groups = await prisma.cdsGroup.findMany();
  return groups.map((g) => ({
    ...g,
    _id: g.id,
    created_at: Number(g.created_at),
    updated_at: Number(g.updated_at),
  }));
}

export async function getCdsGroup(id: string) {
  const group = await prisma.cdsGroup.findUnique({ where: { id } });
  if (!group) return null;
  return {
    _id: group.id,
    name: group.name,
    meeting_days: group.meeting_days,
    meeting_time: group.meeting_time,
    meeting_duration: group.meeting_duration,
    venue_name: group.venue_name,
    created_at: Number(group.created_at),
    updated_at: Number(group.updated_at),
  };
}

export async function createCdsGroup(args: {
  name: string;
  meeting_days: string[];
  meeting_time: string;
  meeting_duration: number;
  venue_name: string;
}) {
  const now = Date.now();
  const created = await prisma.cdsGroup.create({
    data: {
      id: generateId(),
      name: args.name,
      meeting_days: args.meeting_days,
      meeting_time: args.meeting_time,
      meeting_duration: args.meeting_duration,
      venue_name: args.venue_name,
      admin_ids: [],
      created_at: BigInt(now),
      updated_at: BigInt(now),
    },
  });
  return created.id;
}

export async function updateCdsGroup(
  id: string,
  updates: {
    name?: string;
    meeting_days?: string[];
    meeting_time?: string;
    meeting_duration?: number;
    venue_name?: string;
  },
) {
  const now = Date.now();
  const data: Record<string, unknown> = { ...updates, updated_at: BigInt(now) };
  await prisma.cdsGroup.update({
    where: { id },
    data: data as Parameters<typeof prisma.cdsGroup.update>[0]["data"],
  });
  return id;
}

export async function deleteCdsGroup(id: string) {
  const group = await prisma.cdsGroup.findUnique({ where: { id } });
  if (!group) throw new Error("Group not found");

  await prisma.attendance.deleteMany({ where: { cds_group_id: id } });
  await prisma.adminGroupAssignment.deleteMany({ where: { cds_group_id: id } });
  await prisma.cdsGroup.delete({ where: { id } });
  return id;
}
