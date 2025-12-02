import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nowMs, extractBatchFromStateCode } from "./utils";

async function requireSuperAdmin(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .filter((q: any) => q.eq(q.field("session_token"), sessionToken))
    .unique();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const user = await ctx.db.get(session.user_id);
  if (!user || user.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return { session, user };
}

// Helper to get a setting value by key
async function getSettingValue(ctx: any, key: string): Promise<number | null> {
  const setting = await ctx.db
    .query("settings")
    .filter((q: any) => q.eq(q.field("key"), key))
    .first();
  return setting ? parseInt(setting.value, 10) : null;
}

// Get required attendance count, optionally for a specific batch
export const getRequiredAttendanceCount = query({
  args: {
    batch: v.optional(v.union(v.literal("A"), v.literal("B"), v.literal("C"))),
    stateCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let batch: "A" | "B" | "C" | null = args.batch || null;
    
    // If stateCode is provided, extract batch from it
    if (!batch && args.stateCode) {
      const extractedBatch = extractBatchFromStateCode(args.stateCode);
      if (extractedBatch && ["A", "B", "C"].includes(extractedBatch)) {
        batch = extractedBatch as "A" | "B" | "C";
      }
    }
    
    // If we have a batch, check for batch-specific setting first
    if (batch) {
      const batchKey = `required_attendance_per_month_batch_${batch}`;
      const batchValue = await getSettingValue(ctx, batchKey);
      if (batchValue !== null) {
        return batchValue;
      }
    }
    
    // Fall back to default
    const defaultSetting = await getSettingValue(ctx, "required_attendance_per_month");
    return defaultSetting !== null ? defaultSetting : 3;
  },
});

// Get all batch-specific settings for UI display
export const getBatchAttendanceSettings = query({
  args: {},
  handler: async (ctx) => {
    const defaultCount = await getSettingValue(ctx, "required_attendance_per_month");
    const batchA = await getSettingValue(ctx, "required_attendance_per_month_batch_A");
    const batchB = await getSettingValue(ctx, "required_attendance_per_month_batch_B");
    const batchC = await getSettingValue(ctx, "required_attendance_per_month_batch_C");
    
    return {
      default: defaultCount !== null ? defaultCount : 3,
      batchA: batchA,
      batchB: batchB,
      batchC: batchC,
    };
  },
});

// Helper to set a setting value by key
async function setSettingValue(
  ctx: any,
  key: string,
  value: string,
  userId: any
): Promise<void> {
  const now = nowMs();
  const existing = await ctx.db
    .query("settings")
    .filter((q: any) => q.eq(q.field("key"), key))
    .first();
  
  if (existing) {
    await ctx.db.patch(existing._id, {
      value: value,
      updated_by: userId,
      updated_at: now,
    });
  } else {
    await ctx.db.insert("settings", {
      key: key,
      value: value,
      updated_by: userId,
      updated_at: now,
    });
  }
}

// Set default attendance count (backward compatible)
export const setRequiredAttendanceCount = mutation({
  args: {
    sessionToken: v.string(),
    count: v.number(),
  },
  handler: async (ctx, { sessionToken, count }) => {
    const { user } = await requireSuperAdmin(ctx, sessionToken);
    
    if (count < 1) {
      throw new Error("Required attendance count must be at least 1");
    }
    
    await setSettingValue(ctx, "required_attendance_per_month", count.toString(), user._id);
    return { success: true, count };
  },
});

// Set batch-specific attendance requirements
export const setBatchAttendanceRequirements = mutation({
  args: {
    sessionToken: v.string(),
    default: v.number(),
    batchA: v.optional(v.number()),
    batchB: v.optional(v.number()),
    batchC: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, default: defaultCount, batchA, batchB, batchC }) => {
    const { user } = await requireSuperAdmin(ctx, sessionToken);
    
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
    
    const now = nowMs();
    
    // Set default
    await setSettingValue(ctx, "required_attendance_per_month", defaultCount.toString(), user._id);
    
    // Set batch-specific overrides
    if (batchA !== undefined) {
      await setSettingValue(ctx, "required_attendance_per_month_batch_A", batchA.toString(), user._id);
    } else {
      // Remove batch A override if not provided
      const existing = await ctx.db
        .query("settings")
        .filter((q: any) => q.eq(q.field("key"), "required_attendance_per_month_batch_A"))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    
    if (batchB !== undefined) {
      await setSettingValue(ctx, "required_attendance_per_month_batch_B", batchB.toString(), user._id);
    } else {
      const existing = await ctx.db
        .query("settings")
        .filter((q: any) => q.eq(q.field("key"), "required_attendance_per_month_batch_B"))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    
    if (batchC !== undefined) {
      await setSettingValue(ctx, "required_attendance_per_month_batch_C", batchC.toString(), user._id);
    } else {
      const existing = await ctx.db
        .query("settings")
        .filter((q: any) => q.eq(q.field("key"), "required_attendance_per_month_batch_C"))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    
    return { success: true };
  },
});

