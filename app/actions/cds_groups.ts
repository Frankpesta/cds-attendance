"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as cdsGroupsRepo from "@/lib/repositories/cds_groups";

export async function createCdsGroupAction(
  data:
    | FormData
    | {
        name: string;
        meeting_days: string[];
        meeting_time?: string;
        meeting_duration?: number;
        venue_name: string;
      },
) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  let name: string;
  let meeting_days: string[];
  let meeting_time: string;
  let meeting_duration: number;
  let venue_name: string;

  if (data instanceof FormData) {
    name = String(data.get("name") || "").trim();
    meeting_days =
      (data.get("meeting_days") as string)?.split(",").filter(Boolean) ?? [];
    meeting_time = String(data.get("meeting_time") || "14:00").trim();
    meeting_duration = parseInt(
      String(data.get("meeting_duration") || "60"),
      10,
    );
    venue_name = String(data.get("venue_name") || "").trim();
  } else {
    name = data.name.trim();
    meeting_days = data.meeting_days || [];
    meeting_time = data.meeting_time || "14:00";
    meeting_duration = data.meeting_duration ?? 60;
    venue_name = data.venue_name.trim();
  }

  if (!name || !venue_name) {
    return { ok: false, error: "Name and venue are required" } as const;
  }

  try {
    const id = await cdsGroupsRepo.createCdsGroup({
      name,
      meeting_days: meeting_days.length ? meeting_days : ["Monday", "Wednesday", "Friday"],
      meeting_time,
      meeting_duration,
      venue_name,
    });
    return { ok: true, data: id } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to create CDS group"),
    } as const;
  }
}

export async function updateCdsGroupAction(
  id: string,
  data:
    | FormData
    | {
        name: string;
        meeting_days?: string[];
        meeting_time?: string;
        meeting_duration?: number;
        venue_name: string;
      },
) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  let name: string;
  let meeting_days: string[] | undefined;
  let meeting_time: string;
  let meeting_duration: number;
  let venue_name: string;

  if (data instanceof FormData) {
    name = String(data.get("name") || "").trim();
    meeting_days = (data.get("meeting_days") as string)?.split(",").filter(Boolean);
    meeting_time = String(data.get("meeting_time") || "").trim();
    meeting_duration = parseInt(
      String(data.get("meeting_duration") || "60"),
      10,
    );
    venue_name = String(data.get("venue_name") || "").trim();
  } else {
    name = data.name.trim();
    meeting_days = data.meeting_days;
    meeting_time = data.meeting_time || "14:00";
    meeting_duration = data.meeting_duration ?? 60;
    venue_name = data.venue_name.trim();
  }

  if (!name || !venue_name) {
    return { ok: false, error: "Name and venue are required" } as const;
  }

  try {
    await cdsGroupsRepo.updateCdsGroup(id, {
      name,
      ...(meeting_days && { meeting_days }),
      meeting_time,
      meeting_duration,
      venue_name,
    });
    return { ok: true, data: id } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update CDS group"),
    } as const;
  }
}

export async function deleteCdsGroupAction(id: string) {
  const c = await cookies();
  const sessionToken = c.get("session_token")?.value || "";
  if (!sessionToken) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  try {
    await cdsGroupsRepo.deleteCdsGroup(id);
    return { ok: true, data: id } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete CDS group"),
    } as const;
  }
}
