import { prisma } from "@/lib/db";
import { generateId } from "@/lib/id";
import { generateRandomTokenHex } from "@/lib/server-utils";
import { validateMedicalFiles } from "@/lib/storage";

const nowMs = () => Date.now();

async function requireAdminSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true },
  });
  if (!session) throw new Error("Unauthorized");
  const user = session.user;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    throw new Error("Forbidden");
  }
  return { session, user };
}

export type DocLinkType =
  | "corp_member"
  | "employer"
  | "rejected_reposting"
  | "corp_member_request";

export type MedicalFileDescriptor = {
  file_path: string;
  fileName: string;
  fileSize: number;
  contentType: string;
};

export async function createLink(sessionToken: string, type: DocLinkType) {
  const { user } = await requireAdminSession(sessionToken);
  const token = generateRandomTokenHex(16);
  const now = nowMs();
  const linkId = (
    await prisma.documentationLink.create({
      data: {
        id: generateId(),
        token,
        type,
        status: "active",
        created_by_admin_id: user.id,
        created_at: BigInt(now),
        uses_count: 0,
      },
    })
  ).id;
  return { _id: linkId, token, type, status: "active", created_at: now };
}

export async function toggleLinkStatus(
  sessionToken: string,
  linkId: string,
  status: "active" | "inactive",
) {
  await requireAdminSession(sessionToken);
  await prisma.documentationLink.update({
    where: { id: linkId },
    data: {
      status,
      deactivated_at: status === "inactive" ? BigInt(nowMs()) : null,
    },
  });
  return true;
}

export async function listLinks(sessionToken: string, type: DocLinkType) {
  await requireAdminSession(sessionToken);
  const links = await prisma.documentationLink.findMany({
    where: { type },
    take: 500,
  });
  return links.map((l) => ({
    ...l,
    created_at: Number(l.created_at),
    deactivated_at: l.deactivated_at != null ? Number(l.deactivated_at) : null,
  }));
}

export async function validateLink(token: string, type: DocLinkType) {
  const link = await prisma.documentationLink.findFirst({
    where: { token, type, status: "active" },
  });
  if (!link) return null;
  return {
    token: link.token,
    type: link.type,
    status: link.status,
    created_at: Number(link.created_at),
  };
}

export async function submitCorpMember(
  token: string,
  payload: {
    full_name: string;
    state_code: string;
    phone_number: string;
    residential_address: string;
    next_of_kin: string;
    next_of_kin_phone: string;
    gender: string;
    ppa: string;
    course_of_study: string;
    call_up_number: string;
    email: string;
    nysc_account_number: string;
    bank_name: string;
    nin: string;
    cds?: string;
    medical_history: boolean;
  },
  medical_files?: MedicalFileDescriptor[],
) {
  const link = await prisma.documentationLink.findFirst({
    where: { token, type: "corp_member", status: "active" },
  });
  if (!link) throw new Error("Invalid or inactive link");

  const nameParts = payload.full_name.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) {
    throw new Error("Full name must include both Surname and First name");
  }
  if (!/^OD\/(26A|25C)\/\d{4}$/.test(payload.state_code)) {
    throw new Error(
      "State code must be OD/26A/ or OD/25C/ followed by 4 digits",
    );
  }

  const existingStateCode = await prisma.corpMemberDoc.findFirst({
    where: { state_code: payload.state_code, is_deleted: false },
  });
  if (existingStateCode) {
    throw new Error("A record with this state code already exists");
  }

  const existingCallUp = await prisma.corpMemberDoc.findFirst({
    where: { call_up_number: payload.call_up_number, is_deleted: false },
  });
  if (existingCallUp) {
    throw new Error("A record with this call up number already exists");
  }

  const files = payload.medical_history ? medical_files || [] : [];
  if (files.length) validateMedicalFiles(files);

  const now = nowMs();
  const docId = (
    await prisma.corpMemberDoc.create({
      data: {
        id: generateId(),
        link_id: link.id,
        link_token: link.token,
        created_at: BigInt(now),
        updated_at: BigInt(now),
        created_by_admin_id: link.created_by_admin_id,
        is_deleted: false,
        full_name: payload.full_name,
        state_code: payload.state_code,
        phone_number: payload.phone_number,
        residential_address: payload.residential_address,
        next_of_kin: payload.next_of_kin,
        next_of_kin_phone: payload.next_of_kin_phone,
        gender: payload.gender,
        ppa: payload.ppa,
        course_of_study: payload.course_of_study,
        call_up_number: payload.call_up_number,
        email: payload.email,
        nysc_account_number: payload.nysc_account_number,
        bank_name: payload.bank_name,
        nin: payload.nin,
        cds: payload.cds ?? null,
        medical_history: payload.medical_history,
        medical_files: files as object,
      },
    })
  ).id;

  await prisma.documentationLink.update({
    where: { id: link.id },
    data: { uses_count: link.uses_count + 1 },
  });
  return { docId, linkToken: link.token };
}

export async function submitEmployer(
  token: string,
  payload: {
    organization_name: string;
    organization_address: string;
    organization_phone: string;
    contact_person_name: string;
    contact_person_phone: string;
    cms_required_per_year: number;
    accommodation: boolean;
    accommodation_type?: string;
    monthly_stipend: number;
    email: string;
    nearest_landmark: string;
  },
) {
  const link = await prisma.documentationLink.findFirst({
    where: { token, type: "employer", status: "active" },
  });
  if (!link) throw new Error("Invalid or inactive link");

  const now = nowMs();
  const docId = (
    await prisma.employerDoc.create({
      data: {
        id: generateId(),
        link_id: link.id,
        link_token: link.token,
        created_at: BigInt(now),
        updated_at: BigInt(now),
        created_by_admin_id: link.created_by_admin_id,
        is_deleted: false,
        ...payload,
        accommodation_type: payload.accommodation_type ?? null,
      },
    })
  ).id;

  await prisma.documentationLink.update({
    where: { id: link.id },
    data: { uses_count: link.uses_count + 1 },
  });
  return docId;
}

export async function listCorpMembers(sessionToken: string) {
  await requireAdminSession(sessionToken);
  const records = await prisma.corpMemberDoc.findMany({
    where: { is_deleted: false },
    orderBy: { created_at: "desc" },
    take: 2000,
  });
  return records.map((r) => ({
    _id: r.id,
    link_id: r.link_id,
    link_token: r.link_token,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    created_by_admin_id: r.created_by_admin_id,
    is_deleted: r.is_deleted,
    deleted_at: r.deleted_at ? Number(r.deleted_at) : undefined,
    full_name: r.full_name,
    state_code: r.state_code,
    phone_number: r.phone_number,
    residential_address: r.residential_address,
    next_of_kin: r.next_of_kin,
    next_of_kin_phone: r.next_of_kin_phone,
    gender: r.gender,
    ppa: r.ppa,
    course_of_study: r.course_of_study,
    call_up_number: r.call_up_number,
    email: r.email,
    nysc_account_number: r.nysc_account_number,
    bank_name: r.bank_name,
    nin: r.nin,
    cds: r.cds,
    medical_history: r.medical_history,
    medical_files: r.medical_files,
    personal_skill: r.personal_skill,
    saed_camp_skill: r.saed_camp_skill,
    proposed_post_camp_saed_skill: r.proposed_post_camp_saed_skill,
    selected_trainer_name: r.selected_trainer_name,
    selected_trainer_business: r.selected_trainer_business,
    selected_trainer_phone: r.selected_trainer_phone,
    selected_trainer_email: r.selected_trainer_email,
  }));
}

export async function listEmployers(sessionToken: string) {
  await requireAdminSession(sessionToken);
  const records = await prisma.employerDoc.findMany({
    where: { is_deleted: false },
    orderBy: { created_at: "desc" },
    take: 2000,
  });
  return records.map((r) => ({
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  }));
}

export async function getCorpMember(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  const r = await prisma.corpMemberDoc.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  };
}

export async function getEmployer(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  const r = await prisma.employerDoc.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  };
}

export async function updateCorpMember(
  sessionToken: string,
  id: string,
  updates: Partial<{
    full_name: string;
    state_code: string;
    phone_number: string;
    residential_address: string;
    next_of_kin: string;
    next_of_kin_phone: string;
    gender: string;
    ppa: string;
    course_of_study: string;
    call_up_number: string;
    email: string;
    nysc_account_number: string;
    bank_name: string;
    nin: string;
    cds: string;
    medical_history: boolean;
  }>,
  medical_files?: MedicalFileDescriptor[],
) {
  await requireAdminSession(sessionToken);
  const record = await prisma.corpMemberDoc.findUnique({ where: { id } });
  if (!record || record.is_deleted) throw new Error("Record not found");

  if (updates.state_code && updates.state_code !== record.state_code) {
    const existing = await prisma.corpMemberDoc.findFirst({
      where: {
        state_code: updates.state_code,
        is_deleted: false,
        NOT: { id },
      },
    });
    if (existing) throw new Error("A record with this state code already exists");
  }
  if (updates.call_up_number && updates.call_up_number !== record.call_up_number) {
    const existing = await prisma.corpMemberDoc.findFirst({
      where: {
        call_up_number: updates.call_up_number,
        is_deleted: false,
        NOT: { id },
      },
    });
    if (existing) throw new Error("A record with this call up number already exists");
  }

  const doMedical = updates.medical_history ?? record.medical_history;
  const files = doMedical ? medical_files ?? (record.medical_files as MedicalFileDescriptor[]) : [];
  if (files.length) validateMedicalFiles(files);

  await prisma.corpMemberDoc.update({
    where: { id },
    data: { ...updates, medical_files: files, updated_at: BigInt(nowMs()) },
  });
  return true;
}

export async function updateEmployer(
  sessionToken: string,
  id: string,
  updates: Partial<{
    organization_name: string;
    organization_address: string;
    organization_phone: string;
    contact_person_name: string;
    contact_person_phone: string;
    cms_required_per_year: number;
    accommodation: boolean;
    accommodation_type: string;
    monthly_stipend: number;
    email: string;
    nearest_landmark: string;
  }>,
) {
  await requireAdminSession(sessionToken);
  const record = await prisma.employerDoc.findUnique({ where: { id } });
  if (!record || record.is_deleted) throw new Error("Record not found");
  await prisma.employerDoc.update({
    where: { id },
    data: { ...updates, updated_at: BigInt(nowMs()) },
  });
  return true;
}

export async function deleteCorpMember(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  await prisma.corpMemberDoc.update({
    where: { id },
    data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
  });
  return true;
}

export async function batchDeleteCorpMembers(
  sessionToken: string,
  ids: string[],
): Promise<{ deleted: number; errors: string[] }> {
  await requireAdminSession(sessionToken);
  const errors: string[] = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      await prisma.corpMemberDoc.update({
        where: { id },
        data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
      });
      deleted++;
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  return { deleted, errors };
}

export async function deleteEmployer(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  await prisma.employerDoc.update({
    where: { id },
    data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
  });
  return true;
}

export async function batchDeleteEmployers(
  sessionToken: string,
  ids: string[],
): Promise<{ deleted: number; errors: string[] }> {
  await requireAdminSession(sessionToken);
  const errors: string[] = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      await prisma.employerDoc.update({
        where: { id },
        data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
      });
      deleted++;
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  return { deleted, errors };
}

export async function getCorpMemberByLinkToken(linkToken: string) {
  const record = await prisma.corpMemberDoc.findFirst({
    where: { link_token: linkToken, is_deleted: false },
  });
  if (!record) return null;
  return {
    _id: record.id,
    full_name: record.full_name,
    state_code: record.state_code,
    personal_skill: record.personal_skill,
    saed_camp_skill: record.saed_camp_skill,
    proposed_post_camp_saed_skill: record.proposed_post_camp_saed_skill,
    selected_trainer_name: record.selected_trainer_name,
    selected_trainer_business: record.selected_trainer_business,
    selected_trainer_phone: record.selected_trainer_phone,
    selected_trainer_email: record.selected_trainer_email,
  };
}

export async function saveSAEDData(
  linkToken: string,
  data: {
    personalSkill: string;
    saedCampSkill: string;
    proposedPostCampSAEDSkill: string;
    selectedTrainerName?: string;
    selectedTrainerBusiness?: string;
    selectedTrainerPhone?: string;
    selectedTrainerEmail?: string;
  },
) {
  const record = await prisma.corpMemberDoc.findFirst({
    where: { link_token: linkToken, is_deleted: false },
  });
  if (!record) throw new Error("Record not found");
  await prisma.corpMemberDoc.update({
    where: { id: record.id },
    data: {
      personal_skill: data.personalSkill,
      saed_camp_skill: data.saedCampSkill,
      proposed_post_camp_saed_skill: data.proposedPostCampSAEDSkill,
      selected_trainer_name: data.selectedTrainerName ?? null,
      selected_trainer_business: data.selectedTrainerBusiness ?? null,
      selected_trainer_phone: data.selectedTrainerPhone ?? null,
      selected_trainer_email: data.selectedTrainerEmail ?? null,
      updated_at: BigInt(nowMs()),
    },
  });
  return true;
}

// Rejected Reposting
export async function submitRejectedReposting(
  token: string,
  payload: {
    name: string;
    state_code: string;
    sex: string;
    discipline: string;
    previous_ppa: string;
    new_ppa?: string;
    recommendation?: string;
  },
) {
  const link = await prisma.documentationLink.findFirst({
    where: { token, type: "rejected_reposting", status: "active" },
  });
  if (!link) throw new Error("Invalid or inactive link");

  const now = nowMs();
  const docId = (
    await prisma.rejectedRepostingDoc.create({
      data: {
        id: generateId(),
        link_id: link.id,
        link_token: link.token,
        created_at: BigInt(now),
        updated_at: BigInt(now),
        created_by_admin_id: link.created_by_admin_id,
        is_deleted: false,
        ...payload,
        new_ppa: payload.new_ppa ?? null,
        recommendation: payload.recommendation ?? null,
      },
    })
  ).id;

  await prisma.documentationLink.update({
    where: { id: link.id },
    data: { uses_count: link.uses_count + 1 },
  });
  return { docId, linkToken: link.token };
}

export async function listRejectedReposting(sessionToken: string) {
  await requireAdminSession(sessionToken);
  const records = await prisma.rejectedRepostingDoc.findMany({
    where: { is_deleted: false },
    orderBy: { created_at: "desc" },
    take: 2000,
  });
  return records.map((r) => ({
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  }));
}

export async function getRejectedReposting(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  const r = await prisma.rejectedRepostingDoc.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  };
}

export async function updateRejectedReposting(
  sessionToken: string,
  id: string,
  updates: Partial<{
    name: string;
    state_code: string;
    sex: string;
    discipline: string;
    previous_ppa: string;
    new_ppa: string;
    recommendation: string;
  }>,
) {
  await requireAdminSession(sessionToken);
  const record = await prisma.rejectedRepostingDoc.findUnique({ where: { id } });
  if (!record || record.is_deleted) throw new Error("Record not found");
  await prisma.rejectedRepostingDoc.update({
    where: { id },
    data: { ...updates, updated_at: BigInt(nowMs()) },
  });
  return true;
}

export async function deleteRejectedReposting(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  await prisma.rejectedRepostingDoc.update({
    where: { id },
    data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
  });
  return true;
}

export async function batchDeleteRejectedReposting(
  sessionToken: string,
  ids: string[],
): Promise<{ deleted: number; errors: string[] }> {
  await requireAdminSession(sessionToken);
  const errors: string[] = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      await prisma.rejectedRepostingDoc.update({
        where: { id },
        data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
      });
      deleted++;
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  return { deleted, errors };
}

// Corp Member Requests
export async function submitCorpMemberRequest(
  token: string,
  payload: {
    ppa_name: string;
    ppa_address: string;
    ppa_phone_number: string;
    number_of_corp_members_requested: number;
    discipline_needed: string;
    gender_needed: string;
    monthly_stipend: number;
    available_accommodation: boolean;
  },
) {
  const link = await prisma.documentationLink.findFirst({
    where: { token, type: "corp_member_request", status: "active" },
  });
  if (!link) throw new Error("Invalid or inactive link");

  const now = nowMs();
  const docId = (
    await prisma.corpMemberRequest.create({
      data: {
        id: generateId(),
        link_id: link.id,
        link_token: link.token,
        created_at: BigInt(now),
        updated_at: BigInt(now),
        created_by_admin_id: link.created_by_admin_id,
        is_deleted: false,
        ...payload,
      },
    })
  ).id;

  await prisma.documentationLink.update({
    where: { id: link.id },
    data: { uses_count: link.uses_count + 1 },
  });
  return { docId, linkToken: link.token };
}

export async function listCorpMemberRequests(sessionToken: string) {
  await requireAdminSession(sessionToken);
  const records = await prisma.corpMemberRequest.findMany({
    where: { is_deleted: false },
    orderBy: { created_at: "desc" },
    take: 2000,
  });
  return records.map((r) => ({
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  }));
}

export async function getCorpMemberRequest(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  const r = await prisma.corpMemberRequest.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    deleted_at: r.deleted_at != null ? Number(r.deleted_at) : null,
  };
}

export async function updateCorpMemberRequest(
  sessionToken: string,
  id: string,
  updates: Partial<{
    ppa_name: string;
    ppa_address: string;
    ppa_phone_number: string;
    number_of_corp_members_requested: number;
    discipline_needed: string;
    gender_needed: string;
    monthly_stipend: number;
    available_accommodation: boolean;
  }>,
) {
  await requireAdminSession(sessionToken);
  const record = await prisma.corpMemberRequest.findUnique({ where: { id } });
  if (!record || record.is_deleted) throw new Error("Record not found");
  await prisma.corpMemberRequest.update({
    where: { id },
    data: { ...updates, updated_at: BigInt(nowMs()) },
  });
  return true;
}

export async function deleteCorpMemberRequest(sessionToken: string, id: string) {
  await requireAdminSession(sessionToken);
  await prisma.corpMemberRequest.update({
    where: { id },
    data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
  });
  return true;
}

export async function batchDeleteCorpMemberRequests(
  sessionToken: string,
  ids: string[],
): Promise<{ deleted: number; errors: string[] }> {
  await requireAdminSession(sessionToken);
  const errors: string[] = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      await prisma.corpMemberRequest.update({
        where: { id },
        data: { is_deleted: true, deleted_at: BigInt(nowMs()) },
      });
      deleted++;
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  return { deleted, errors };
}
