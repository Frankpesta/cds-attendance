import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateRandomTokenHex, nowMs } from "./utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MEDICAL_FILES = 3;

const documentationType = v.union(v.literal("corp_member"), v.literal("employer"), v.literal("rejected_reposting"));

const fileDescriptor = v.object({
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileSize: v.number(),
  contentType: v.string(),
});

async function requireAdminSession(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .filter((q: any) => q.eq(q.field("session_token"), sessionToken))
    .unique();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const user = await ctx.db.get(session.user_id);
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    throw new Error("Forbidden");
  }
  return { session, user };
}

export const createLink = mutation({
  args: {
    sessionToken: v.string(),
    type: documentationType,
  },
  handler: async (ctx, { sessionToken, type }) => {
    const { user } = await requireAdminSession(ctx, sessionToken);
    const token = generateRandomTokenHex(16);
    const now = nowMs();
    const linkId = await ctx.db.insert("documentation_links", {
      token,
      type,
      status: "active",
      created_by_admin_id: user._id,
      created_at: now,
      uses_count: 0,
      deactivated_at: undefined,
    });
    return { _id: linkId, token, type, status: "active", created_at: now };
  },
});

export const toggleLinkStatus = mutation({
  args: {
    sessionToken: v.string(),
    linkId: v.id("documentation_links"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, { sessionToken, linkId, status }) => {
    await requireAdminSession(ctx, sessionToken);
    await ctx.db.patch(linkId, { status, deactivated_at: status === "inactive" ? nowMs() : undefined });
    return true;
  },
});

export const listLinks = query({
  args: {
    sessionToken: v.string(),
    type: documentationType,
  },
  handler: async (ctx, { sessionToken, type }) => {
    await requireAdminSession(ctx, sessionToken);
    return ctx.db
      .query("documentation_links")
      .filter((q) => q.eq(q.field("type"), type))
      .collect();
  },
});

export const validateLink = query({
  args: {
    token: v.string(),
    type: documentationType,
  },
  handler: async (ctx, { token, type }) => {
    const link = await ctx.db
      .query("documentation_links")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!link || link.type !== type || link.status !== "active") {
      return null;
    }
    return {
      token: link.token,
      type: link.type,
      status: link.status,
      created_at: link.created_at,
    };
  },
});

function validateFiles(files: any[]) {
  if (files.length > MAX_MEDICAL_FILES) {
    throw new Error(`A maximum of ${MAX_MEDICAL_FILES} files is allowed`);
  }
  files.forEach((file) => {
    if (file.fileSize > MAX_FILE_BYTES) {
      throw new Error("File exceeds the 5MB limit");
    }
    if (file.contentType !== "application/pdf" && !file.contentType.startsWith("image/")) {
      throw new Error("Only PDF and image files are allowed");
    }
  });
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitCorpMember = mutation({
  args: {
    token: v.string(),
    payload: v.object({
      full_name: v.string(),
      state_code: v.string(),
      phone_number: v.string(),
      residential_address: v.string(),
      next_of_kin: v.string(),
      next_of_kin_phone: v.string(),
      gender: v.string(),
      ppa: v.string(),
      course_of_study: v.string(),
      call_up_number: v.string(),
      email: v.string(),
      nysc_account_number: v.string(),
      bank_name: v.string(),
      nin: v.string(),
      cds: v.optional(v.string()),
      medical_history: v.boolean(),
    }),
    medical_files: v.optional(v.array(fileDescriptor)),
  },
  handler: async (ctx, { token, payload, medical_files }) => {
    const link = await ctx.db
      .query("documentation_links")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!link || link.type !== "corp_member" || link.status !== "active") {
      throw new Error("Invalid or inactive link");
    }
    
    // Check for duplicate state_code
    const existingStateCode = await ctx.db
      .query("corp_member_docs")
      .filter((q) => q.and(
        q.eq(q.field("state_code"), payload.state_code),
        q.eq(q.field("is_deleted"), false)
      ))
      .first();
    if (existingStateCode) {
      throw new Error("A record with this state code already exists");
    }
    
    // Check for duplicate call_up_number
    const existingCallUp = await ctx.db
      .query("corp_member_docs")
      .filter((q) => q.and(
        q.eq(q.field("call_up_number"), payload.call_up_number),
        q.eq(q.field("is_deleted"), false)
      ))
      .first();
    if (existingCallUp) {
      throw new Error("A record with this call up number already exists");
    }
    
    const files = payload.medical_history ? medical_files || [] : [];
    if (files.length) {
      validateFiles(files);
    }
    const now = nowMs();
    const docId = await ctx.db.insert("corp_member_docs", {
      link_id: link._id,
      link_token: link.token,
      created_at: now,
      updated_at: now,
      created_by_admin_id: link.created_by_admin_id,
      is_deleted: false,
      deleted_at: undefined,
      ...payload,
      medical_files: files,
    });
    await ctx.db.patch(link._id, { uses_count: link.uses_count + 1 });
    return { docId, linkToken: link.token };
  },
});

export const submitEmployer = mutation({
  args: {
    token: v.string(),
    payload: v.object({
      organization_name: v.string(),
      organization_address: v.string(),
      organization_phone: v.string(),
      contact_person_name: v.string(),
      contact_person_phone: v.string(),
      cms_required_per_year: v.number(),
      accommodation: v.boolean(),
      accommodation_type: v.optional(v.string()),
      monthly_stipend: v.number(),
      email: v.string(),
      nearest_landmark: v.string(),
    }),
  },
  handler: async (ctx, { token, payload }) => {
    const link = await ctx.db
      .query("documentation_links")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!link || link.type !== "employer" || link.status !== "active") {
      throw new Error("Invalid or inactive link");
    }
    const now = nowMs();
    const docId = await ctx.db.insert("employer_docs", {
      link_id: link._id,
      link_token: link.token,
      created_at: now,
      updated_at: now,
      created_by_admin_id: link.created_by_admin_id,
      is_deleted: false,
      deleted_at: undefined,
      ...payload,
    });
    await ctx.db.patch(link._id, { uses_count: link.uses_count + 1 });
    return docId;
  },
});

export const listCorpMembers = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdminSession(ctx, sessionToken);
    const records = await ctx.db
      .query("corp_member_docs")
      .filter((q) => q.eq(q.field("is_deleted"), false))
      .collect();
    
    // Explicitly return all fields including SAED details
    return records.sort((a, b) => b.created_at - a.created_at).map((record) => ({
      _id: record._id,
      link_id: record.link_id,
      link_token: record.link_token,
      created_at: record.created_at,
      updated_at: record.updated_at,
      created_by_admin_id: record.created_by_admin_id,
      is_deleted: record.is_deleted,
      deleted_at: record.deleted_at,
      full_name: record.full_name,
      state_code: record.state_code,
      phone_number: record.phone_number,
      residential_address: record.residential_address,
      next_of_kin: record.next_of_kin,
      next_of_kin_phone: record.next_of_kin_phone,
      gender: record.gender,
      ppa: record.ppa,
      course_of_study: record.course_of_study,
      call_up_number: record.call_up_number,
      email: record.email,
      nysc_account_number: record.nysc_account_number,
      bank_name: record.bank_name,
      nin: record.nin,
      cds: record.cds,
      medical_history: record.medical_history,
      medical_files: record.medical_files,
      // SAED fields explicitly included
      personal_skill: record.personal_skill,
      saed_camp_skill: record.saed_camp_skill,
      proposed_post_camp_saed_skill: record.proposed_post_camp_saed_skill,
      selected_trainer_name: record.selected_trainer_name,
      selected_trainer_business: record.selected_trainer_business,
      selected_trainer_phone: record.selected_trainer_phone,
      selected_trainer_email: record.selected_trainer_email,
    }));
  },
});

export const listEmployers = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdminSession(ctx, sessionToken);
    const records = await ctx.db
      .query("employer_docs")
      .filter((q) => q.eq(q.field("is_deleted"), false))
      .collect();
    return records.sort((a, b) => b.created_at - a.created_at);
  },
});

export const getCorpMember = query({
  args: { sessionToken: v.string(), id: v.id("corp_member_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    return await ctx.db.get(id);
  },
});

export const getEmployer = query({
  args: { sessionToken: v.string(), id: v.id("employer_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    return await ctx.db.get(id);
  },
});

export const updateCorpMember = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("corp_member_docs"),
    updates: v.object({
      full_name: v.optional(v.string()),
      state_code: v.optional(v.string()),
      phone_number: v.optional(v.string()),
      residential_address: v.optional(v.string()),
      next_of_kin: v.optional(v.string()),
      next_of_kin_phone: v.optional(v.string()),
      gender: v.optional(v.string()),
      ppa: v.optional(v.string()),
      course_of_study: v.optional(v.string()),
      call_up_number: v.optional(v.string()),
      email: v.optional(v.string()),
      nysc_account_number: v.optional(v.string()),
      bank_name: v.optional(v.string()),
      nin: v.optional(v.string()),
      cds: v.optional(v.string()),
      medical_history: v.optional(v.boolean()),
    }),
    medical_files: v.optional(v.array(fileDescriptor)),
  },
  handler: async (ctx, { sessionToken, id, updates, medical_files }) => {
    await requireAdminSession(ctx, sessionToken);
    const record = await ctx.db.get(id);
    if (!record || record.is_deleted) {
      throw new Error("Record not found");
    }
    
    // Check for duplicate state_code if being updated
    if (updates.state_code && updates.state_code !== record.state_code) {
      const existingStateCode = await ctx.db
        .query("corp_member_docs")
        .filter((q) => q.and(
          q.eq(q.field("state_code"), updates.state_code),
          q.eq(q.field("is_deleted"), false),
          q.neq(q.field("_id"), id)
        ))
        .first();
      if (existingStateCode) {
        throw new Error("A record with this state code already exists");
      }
    }
    
    // Check for duplicate call_up_number if being updated
    if (updates.call_up_number && updates.call_up_number !== record.call_up_number) {
      const existingCallUp = await ctx.db
        .query("corp_member_docs")
        .filter((q) => q.and(
          q.eq(q.field("call_up_number"), updates.call_up_number),
          q.eq(q.field("is_deleted"), false),
          q.neq(q.field("_id"), id)
        ))
        .first();
      if (existingCallUp) {
        throw new Error("A record with this call up number already exists");
      }
    }
    
    const doMedical = updates.medical_history ?? record.medical_history;
    const files = doMedical ? medical_files ?? record.medical_files : [];
    if (files.length) {
      validateFiles(files);
    }
    await ctx.db.patch(id, {
      ...updates,
      medical_files: files,
      updated_at: nowMs(),
    });
    return true;
  },
});

export const updateEmployer = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("employer_docs"),
    updates: v.object({
      organization_name: v.optional(v.string()),
      organization_address: v.optional(v.string()),
      organization_phone: v.optional(v.string()),
      contact_person_name: v.optional(v.string()),
      contact_person_phone: v.optional(v.string()),
      cms_required_per_year: v.optional(v.number()),
      accommodation: v.optional(v.boolean()),
      accommodation_type: v.optional(v.string()),
      monthly_stipend: v.optional(v.number()),
      email: v.optional(v.string()),
      nearest_landmark: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { sessionToken, id, updates }) => {
    await requireAdminSession(ctx, sessionToken);
    const record = await ctx.db.get(id);
    if (!record || record.is_deleted) {
      throw new Error("Record not found");
    }
    await ctx.db.patch(id, {
      ...updates,
      updated_at: nowMs(),
    });
    return true;
  },
});

export const deleteCorpMember = mutation({
  args: { sessionToken: v.string(), id: v.id("corp_member_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    await ctx.db.patch(id, { is_deleted: true, deleted_at: nowMs() });
    return true;
  },
});

export const deleteEmployer = mutation({
  args: { sessionToken: v.string(), id: v.id("employer_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    await ctx.db.patch(id, { is_deleted: true, deleted_at: nowMs() });
    return true;
  },
});

export const getFileUrl = mutation({
  args: { sessionToken: v.string(), fileId: v.id("_storage") },
  handler: async (ctx, { sessionToken, fileId }) => {
    await requireAdminSession(ctx, sessionToken);
    return await ctx.storage.getUrl(fileId);
  },
});

// Get corp member doc by link token (for SAED page)
export const getCorpMemberByLinkToken = query({
  args: { linkToken: v.string() },
  handler: async (ctx, { linkToken }) => {
    const record = await ctx.db
      .query("corp_member_docs")
      .filter((q) => q.eq(q.field("link_token"), linkToken))
      .filter((q) => q.eq(q.field("is_deleted"), false))
      .first();
    if (!record) {
      return null;
    }
    return {
      _id: record._id,
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
  },
});

// Save SAED data
export const saveSAEDData = mutation({
  args: {
    linkToken: v.string(),
    personalSkill: v.string(),
    saedCampSkill: v.string(),
    proposedPostCampSAEDSkill: v.string(),
    selectedTrainerName: v.optional(v.string()),
    selectedTrainerBusiness: v.optional(v.string()),
    selectedTrainerPhone: v.optional(v.string()),
    selectedTrainerEmail: v.optional(v.string()),
  },
  handler: async (ctx, { linkToken, personalSkill, saedCampSkill, proposedPostCampSAEDSkill, selectedTrainerName, selectedTrainerBusiness, selectedTrainerPhone, selectedTrainerEmail }) => {
    const record = await ctx.db
      .query("corp_member_docs")
      .filter((q) => q.eq(q.field("link_token"), linkToken))
      .filter((q) => q.eq(q.field("is_deleted"), false))
      .first();
    
    if (!record) {
      throw new Error("Record not found");
    }
    
    await ctx.db.patch(record._id, {
      personal_skill: personalSkill,
      saed_camp_skill: saedCampSkill,
      proposed_post_camp_saed_skill: proposedPostCampSAEDSkill,
      selected_trainer_name: selectedTrainerName,
      selected_trainer_business: selectedTrainerBusiness,
      selected_trainer_phone: selectedTrainerPhone,
      selected_trainer_email: selectedTrainerEmail,
      updated_at: nowMs(),
    });
    
    return true;
  },
});

// ========== Rejected/Reposting Corp Members ==========

export const submitRejectedReposting = mutation({
  args: {
    token: v.string(),
    payload: v.object({
      name: v.string(),
      state_code: v.string(),
      sex: v.string(),
      discipline: v.string(),
      previous_ppa: v.string(),
      new_ppa: v.optional(v.string()),
      recommendation: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, payload }) => {
    const link = await ctx.db
      .query("documentation_links")
      .filter((q) => q.eq(q.field("token"), token))
      .unique();
    if (!link || link.type !== "rejected_reposting" || link.status !== "active") {
      throw new Error("Invalid or inactive link");
    }
    const now = nowMs();
    const docId = await ctx.db.insert("rejected_reposting_docs", {
      link_id: link._id,
      link_token: link.token,
      created_at: now,
      updated_at: now,
      created_by_admin_id: link.created_by_admin_id,
      is_deleted: false,
      deleted_at: undefined,
      ...payload,
    });
    await ctx.db.patch(link._id, { uses_count: link.uses_count + 1 });
    return { docId, linkToken: link.token };
  },
});

export const listRejectedReposting = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdminSession(ctx, sessionToken);
    const records = await ctx.db
      .query("rejected_reposting_docs")
      .filter((q) => q.eq(q.field("is_deleted"), false))
      .collect();
    return records.sort((a, b) => b.created_at - a.created_at);
  },
});

export const getRejectedReposting = query({
  args: { sessionToken: v.string(), id: v.id("rejected_reposting_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    return await ctx.db.get(id);
  },
});

export const updateRejectedReposting = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("rejected_reposting_docs"),
    updates: v.object({
      name: v.optional(v.string()),
      state_code: v.optional(v.string()),
      sex: v.optional(v.string()),
      discipline: v.optional(v.string()),
      previous_ppa: v.optional(v.string()),
      new_ppa: v.optional(v.string()),
      recommendation: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { sessionToken, id, updates }) => {
    await requireAdminSession(ctx, sessionToken);
    const record = await ctx.db.get(id);
    if (!record || record.is_deleted) {
      throw new Error("Record not found");
    }
    await ctx.db.patch(id, {
      ...updates,
      updated_at: nowMs(),
    });
    return true;
  },
});

export const deleteRejectedReposting = mutation({
  args: { sessionToken: v.string(), id: v.id("rejected_reposting_docs") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdminSession(ctx, sessionToken);
    await ctx.db.patch(id, { is_deleted: true, deleted_at: nowMs() });
    return true;
  },
});