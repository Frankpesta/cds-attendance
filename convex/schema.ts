import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    state_code: v.string(),
    password: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("corps_member")),
    cds_group_id: v.optional(v.id("cds_groups")),
    created_at: v.number(), // ms epoch UTC
    updated_at: v.number(), // ms epoch UTC
  })
    .index("by_email", ["email"]) // unique in logic
    .index("by_state_code", ["state_code"]) // unique in logic
    .index("by_role", ["role"])
    .index("by_group", ["cds_group_id"]),

  cds_groups: defineTable({
    name: v.string(),
    meeting_days: v.array(v.string()),
    meeting_time: v.string(), // HH:mm 24h
    meeting_duration: v.number(), // minutes
    venue_name: v.string(),
    admin_ids: v.array(v.id("users")),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_name", ["name"]),

  admin_group_assignments: defineTable({
    admin_id: v.id("users"),
    cds_group_id: v.id("cds_groups"),
    created_at: v.number(),
  })
    .index("by_admin", ["admin_id"])
    .index("by_group", ["cds_group_id"]),

  meetings: defineTable({
    meeting_date: v.string(), // YYYY-MM-DD (WAT displayed)
    cds_group_ids: v.array(v.id("cds_groups")),
    is_active: v.boolean(),
    activated_by_admin_id: v.optional(v.id("users")),
    activated_at: v.optional(v.number()),
    deactivated_at: v.optional(v.number()),
  })
    .index("by_date", ["meeting_date"]) // one per day
    .index("by_active", ["is_active"]),

  qr_tokens: defineTable({
    token: v.string(),
    meeting_date: v.string(), // YYYY-MM-DD
    generated_by_admin_id: v.id("users"),
    generated_at: v.number(),
    expires_at: v.number(),
    rotation_sequence: v.number(),
    is_consumed: v.boolean(),
  })
    .index("by_token", ["token"]) // unique in logic
    .index("by_meeting_date", ["meeting_date"]) // for cleanup/validation
    .index("by_rotation", ["meeting_date", "rotation_sequence"]),

  attendance: defineTable({
    user_id: v.id("users"),
    cds_group_id: v.id("cds_groups"),
    meeting_date: v.string(),
    scanned_at: v.number(),
    qr_token_id: v.id("qr_tokens"),
    status: v.union(v.literal("present"), v.literal("absent")),
  })
    .index("by_user_date", ["user_id", "meeting_date"]) // prevent duplicate same day
    .index("by_group_date", ["cds_group_id", "meeting_date"]) // reports
    .index("by_date", ["meeting_date"]),

  user_cds_assignment_history: defineTable({
    user_id: v.id("users"),
    cds_group_id: v.id("cds_groups"),
    start_date: v.string(), // YYYY-MM-DD
    end_date: v.optional(v.string()), // YYYY-MM-DD
    changed_by_admin_id: v.id("users"),
    reason: v.optional(v.string()),
  })
    .index("by_user", ["user_id"]) 
    .index("by_group", ["cds_group_id"]),

  sessions: defineTable({
    user_id: v.id("users"),
    session_token: v.string(),
    created_at: v.number(),
    last_active_at: v.number(),
    expires_at: v.number(),
  })
    .index("by_token", ["session_token"]) 
    .index("by_user", ["user_id"]) ,

  audit_logs: defineTable({
    actor_user_id: v.id("users"),
    action: v.string(),
    details: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_actor", ["actor_user_id"]).index("by_time", ["created_at"]),

  documentation_links: defineTable({
    token: v.string(),
    type: v.union(v.literal("corp_member"), v.literal("employer")),
    status: v.union(v.literal("active"), v.literal("inactive")),
    created_by_admin_id: v.id("users"),
    created_at: v.number(),
    uses_count: v.number(),
    deactivated_at: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_type", ["type"]),

  corp_member_docs: defineTable({
    link_id: v.id("documentation_links"),
    link_token: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
    created_by_admin_id: v.id("users"),
    is_deleted: v.boolean(),
    deleted_at: v.optional(v.number()),
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
    medical_files: v.array(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.string(),
        fileSize: v.number(),
        contentType: v.string(),
      }),
    ),
    personal_skill: v.optional(v.string()),
    saed_camp_skill: v.optional(v.string()),
    proposed_post_camp_saed_skill: v.optional(v.string()),
    selected_trainer_name: v.optional(v.string()),
    selected_trainer_business: v.optional(v.string()),
    selected_trainer_phone: v.optional(v.string()),
    selected_trainer_email: v.optional(v.string()),
  })
    .index("by_link", ["link_token"])
    .index("by_created_at", ["created_at"]),

  employer_docs: defineTable({
    link_id: v.id("documentation_links"),
    link_token: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
    created_by_admin_id: v.id("users"),
    is_deleted: v.boolean(),
    deleted_at: v.optional(v.number()),
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
  })
    .index("by_link", ["link_token"])
    .index("by_created_at", ["created_at"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updated_by: v.id("users"),
    updated_at: v.number(),
  })
    .index("by_key", ["key"]), // unique in logic
});


