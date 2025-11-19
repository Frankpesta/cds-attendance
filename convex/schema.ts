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
});


