"use server";
import { cookies } from "next/headers";
import { extractErrorMessage } from "@/lib/utils";
import * as docRepo from "@/lib/repositories/documentation";
import type { MedicalFileDescriptor } from "@/lib/repositories/documentation";

async function getSessionToken() {
  const c = await cookies();
  return c.get("session_token")?.value || "";
}

export async function createLinkAction(type: docRepo.DocLinkType) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await docRepo.createLink(sessionToken, type);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to create link"),
    } as const;
  }
}

export async function toggleLinkStatusAction(
  linkId: string,
  status: "active" | "inactive",
) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.toggleLinkStatus(sessionToken, linkId, status);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to toggle link"),
    } as const;
  }
}

export async function updateCorpMemberAction(
  id: string,
  updates: Parameters<typeof docRepo.updateCorpMember>[2],
  medical_files?: MedicalFileDescriptor[],
) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.updateCorpMember(sessionToken, id, updates, medical_files);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update corp member"),
    } as const;
  }
}

export async function deleteCorpMemberAction(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.deleteCorpMember(sessionToken, id);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete corp member"),
    } as const;
  }
}

export async function batchDeleteCorpMembersAction(ids: string[]) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await docRepo.batchDeleteCorpMembers(sessionToken, ids);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete corp members"),
    } as const;
  }
}

export async function updateEmployerAction(
  id: string,
  updates: Parameters<typeof docRepo.updateEmployer>[2],
) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.updateEmployer(sessionToken, id, updates);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update employer"),
    } as const;
  }
}

export async function deleteEmployerAction(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.deleteEmployer(sessionToken, id);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete employer"),
    } as const;
  }
}

export async function batchDeleteEmployersAction(ids: string[]) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await docRepo.batchDeleteEmployers(sessionToken, ids);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete employers"),
    } as const;
  }
}

export async function updateRejectedRepostingAction(
  id: string,
  updates: Parameters<typeof docRepo.updateRejectedReposting>[2],
) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.updateRejectedReposting(sessionToken, id, updates);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update record"),
    } as const;
  }
}

export async function deleteRejectedRepostingAction(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.deleteRejectedReposting(sessionToken, id);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete record"),
    } as const;
  }
}

export async function batchDeleteRejectedRepostingAction(ids: string[]) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await docRepo.batchDeleteRejectedReposting(sessionToken, ids);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete records"),
    } as const;
  }
}

export async function updateCorpMemberRequestAction(
  id: string,
  updates: Parameters<typeof docRepo.updateCorpMemberRequest>[2],
) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.updateCorpMemberRequest(sessionToken, id, updates);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to update record"),
    } as const;
  }
}

export async function deleteCorpMemberRequestAction(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    await docRepo.deleteCorpMemberRequest(sessionToken, id);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete record"),
    } as const;
  }
}

export async function batchDeleteCorpMemberRequestsAction(ids: string[]) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "Unauthorized" } as const;
  try {
    const res = await docRepo.batchDeleteCorpMemberRequests(sessionToken, ids);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to delete records"),
    } as const;
  }
}

export async function submitCorpMemberAction(
  token: string,
  payload: Parameters<typeof docRepo.submitCorpMember>[1],
  medical_files?: MedicalFileDescriptor[],
) {
  try {
    const res = await docRepo.submitCorpMember(token, payload, medical_files);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to submit"),
    } as const;
  }
}

export async function submitEmployerAction(
  token: string,
  payload: Parameters<typeof docRepo.submitEmployer>[1],
) {
  try {
    const res = await docRepo.submitEmployer(token, payload);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to submit"),
    } as const;
  }
}

export async function submitRejectedRepostingAction(
  token: string,
  payload: Parameters<typeof docRepo.submitRejectedReposting>[1],
) {
  try {
    const res = await docRepo.submitRejectedReposting(token, payload);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to submit"),
    } as const;
  }
}

export async function submitCorpMemberRequestAction(
  token: string,
  payload: Parameters<typeof docRepo.submitCorpMemberRequest>[1],
) {
  try {
    const res = await docRepo.submitCorpMemberRequest(token, payload);
    return { ok: true, data: res } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to submit"),
    } as const;
  }
}

export async function getUploadUrlAction() {
  return { ok: true, url: "/api/upload/medical" } as const;
}

export async function getFileUrlAction(relativePath: string) {
  return `/api/files/${encodeURIComponent(relativePath)}`;
}

export async function saveSAEDDataAction(
  linkToken: string,
  data: Parameters<typeof docRepo.saveSAEDData>[1],
) {
  try {
    await docRepo.saveSAEDData(linkToken, data);
    return { ok: true } as const;
  } catch (e: unknown) {
    return {
      ok: false,
      error: extractErrorMessage(e, "Failed to save"),
    } as const;
  }
}
