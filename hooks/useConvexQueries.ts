"use client";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Stable empty args for queries that take no arguments
const EMPTY = {};

/** CDS groups list — cached, shared across pages */
export function useCdsGroupsList() {
  return useQuery(convexQuery(api.cds_groups.list, EMPTY));
}

/** Single CDS group by id */
export function useCdsGroup(id: Id<"cds_groups"> | null) {
  return useQuery(
    convexQuery(api.cds_groups.get, id ? { id } : "skip")
  );
}

/** Dashboard stats — optional userId for member view */
export function useDashboardStats(userId?: Id<"users">) {
  return useQuery(
    convexQuery(api.dashboard.getStats, userId != null ? { userId } : EMPTY)
  );
}

/** User-specific stats (member dashboard) */
export function useUserStats(userId: Id<"users"> | null) {
  return useQuery(
    convexQuery(api.dashboard.getUserStats, userId ? { userId } : "skip")
  );
}

/** Recent activity — limit and optional userId */
export function useRecentActivity(limit: number, userId?: Id<"users">) {
  return useQuery(
    convexQuery(api.dashboard.getRecentActivity, { limit, ...(userId != null ? { userId } : {}) })
  );
}

/** Top groups by attendance */
export function useTopGroups(limit: number = 5) {
  return useQuery(convexQuery(api.dashboard.getTopGroups, { limit }));
}

/** Users list (admin) */
export function useUsersList() {
  return useQuery(convexQuery(api.users.list, EMPTY));
}

/** Single user by id */
export function useUser(id: Id<"users"> | null) {
  return useQuery(
    convexQuery(api.users.get, id ? { id } : "skip")
  );
}

/** Settings: batch attendance requirements */
export function useBatchAttendanceSettings() {
  return useQuery(convexQuery(api.settings.getBatchAttendanceSettings, EMPTY));
}

/** Required attendance count — optional batch/stateCode */
export function useRequiredAttendanceCount(opts?: { batch?: "A" | "B" | "C"; stateCode?: string }) {
  return useQuery(
    convexQuery(api.settings.getRequiredAttendanceCount, opts ?? EMPTY)
  );
}

/** Admin assignments list */
export function useAdminAssignments() {
  return useQuery(convexQuery(api.admin_assignments.list, EMPTY));
}

/** Today's attendance (monitor) — real-time kept for live updates */
export function useTodayAttendance() {
  return useQuery(convexQuery(api.attendance.getTodayAttendance, EMPTY));
}

/** User attendance history — limit default 100 to reduce bandwidth */
export function useUserAttendanceHistory(userId: Id<"users"> | null, limit = 100) {
  return useQuery(
    convexQuery(api.attendance.getUserHistory, userId ? { userId, limit } : "skip")
  );
}

/** All active QR sessions (admin) */
export function useAllActiveQr() {
  return useQuery(convexQuery(api.qr.getAllActiveQr, EMPTY));
}

/** Today's meeting date (display) */
export function useTodayMeetingDate() {
  return useQuery(convexQuery(api.qr.getTodayMeetingDate, EMPTY));
}

/** Active QR for a specific meeting */
export function useActiveQr(meetingId: string | null) {
  return useQuery(
    convexQuery(api.qr.getActiveQr, meetingId ? { meetingId: meetingId as Id<"meetings"> } : "skip")
  );
}

/** My active sessions (admin dashboard) */
export function useMyActiveSessions(sessionToken: string | null) {
  return useQuery(
    convexQuery(api.qr.getMyActiveSessions, sessionToken ? { sessionToken } : "skip")
  );
}

/** Today's groups for admin (with session token) */
export function useTodayGroups(sessionToken: string | null) {
  return useQuery(
    convexQuery(api.qr.getTodayGroups, sessionToken ? { sessionToken } : "skip")
  );
}

// Documentation — type for listLinks/validateLink
type DocumentationType = "corp_member" | "employer" | "rejected_reposting" | "corp_member_request";

/** Documentation: list links by type (admin) */
export function useDocumentationListLinks(sessionToken: string | null, type: DocumentationType) {
  return useQuery(
    convexQuery(
      api.documentation.listLinks,
      sessionToken ? { sessionToken, type } : "skip"
    )
  );
}

/** Documentation: validate public link (token + type) */
export function useDocumentationValidateLink(token: string | null, type: DocumentationType) {
  return useQuery(
    convexQuery(api.documentation.validateLink, token ? { token, type } : "skip")
  );
}

/** Documentation: list corp member requests (admin) */
export function useDocumentationListCorpMemberRequests(sessionToken: string | null) {
  return useQuery(
    convexQuery(
      api.documentation.listCorpMemberRequests,
      sessionToken ? { sessionToken } : "skip"
    )
  );
}

/** Documentation: list corp members (admin) */
export function useDocumentationListCorpMembers(sessionToken: string | null) {
  return useQuery(
    convexQuery(api.documentation.listCorpMembers, sessionToken ? { sessionToken } : "skip")
  );
}

/** Documentation: list employers (admin) */
export function useDocumentationListEmployers(sessionToken: string | null) {
  return useQuery(
    convexQuery(api.documentation.listEmployers, sessionToken ? { sessionToken } : "skip")
  );
}

/** Documentation: list rejected reposting (admin) */
export function useDocumentationListRejectedReposting(sessionToken: string | null) {
  return useQuery(
    convexQuery(
      api.documentation.listRejectedReposting,
      sessionToken ? { sessionToken } : "skip"
    )
  );
}

/** Documentation: get corp member doc by link token (public SAED page) */
export function useDocumentationCorpMemberByLinkToken(linkToken: string | null) {
  return useQuery(
    convexQuery(
      api.documentation.getCorpMemberByLinkToken,
      linkToken ? { linkToken } : "skip"
    )
  );
}
