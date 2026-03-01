import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";

export async function listAdminAssignments() {
  const assignments = await prisma.adminGroupAssignment.findMany();
  return assignments.map((a) => ({
    _id: a.id,
    admin_id: a.admin_id,
    cds_group_id: a.cds_group_id,
    created_at: Number(a.created_at),
  }));
}

export async function createAdminAssignment(adminId: string, cdsGroupId: string) {
  const existing = await prisma.adminGroupAssignment.findFirst({
    where: { admin_id: adminId, cds_group_id: cdsGroupId },
  });
  if (existing) throw new Error("Admin is already assigned to this group");

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "admin") {
    throw new Error("Invalid admin user");
  }

  const group = await prisma.cdsGroup.findUnique({ where: { id: cdsGroupId } });
  if (!group) throw new Error("Invalid CDS group");

  const id = (
    await prisma.adminGroupAssignment.create({
      data: {
        id: generateId(),
        admin_id: adminId,
        cds_group_id: cdsGroupId,
        created_at: BigInt(Date.now()),
      },
    })
  ).id;
  return id;
}

export async function removeAdminAssignment(id: string) {
  const assignment = await prisma.adminGroupAssignment.findUnique({
    where: { id },
  });
  if (!assignment) throw new Error("Assignment not found");
  await prisma.adminGroupAssignment.delete({ where: { id } });
  return id;
}

export async function getByAdmin(adminId: string) {
  const assignments = await prisma.adminGroupAssignment.findMany({
    where: { admin_id: adminId },
  });
  return assignments.map((a) => ({
    _id: a.id,
    admin_id: a.admin_id,
    cds_group_id: a.cds_group_id,
    created_at: Number(a.created_at),
  }));
}

export async function getByGroup(cdsGroupId: string) {
  const assignments = await prisma.adminGroupAssignment.findMany({
    where: { cds_group_id: cdsGroupId },
  });
  return assignments.map((a) => ({
    _id: a.id,
    admin_id: a.admin_id,
    cds_group_id: a.cds_group_id,
    created_at: Number(a.created_at),
  }));
}
