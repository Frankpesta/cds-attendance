import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateRandomTokenHex, nowMs } from "./utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MEDICAL_FILES = 3;

const documentationType = v.union(v.literal("corp_member"), v.literal("employer"));

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
      cds: v.string(),
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
    return docId;
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
    return records.sort((a, b) => b.created_at - a.created_at);
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
