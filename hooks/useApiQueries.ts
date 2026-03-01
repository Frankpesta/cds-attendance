"use client";
import { useQuery } from "@tanstack/react-query";

type DocumentationType =
  | "corp_member"
  | "employer"
  | "rejected_reposting"
  | "corp_member_request";

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

/** CDS groups list */
export function useCdsGroupsList() {
  return useQuery({
    queryKey: ["cds-groups"],
    queryFn: () => fetchApi<{ id: string; _id: string; name: string; meeting_days?: string[]; meeting_time?: string; venue_name?: string }[]>("/api/cds-groups"),
  });
}

/** Single CDS group by id */
export function useCdsGroup(id: string | null) {
  return useQuery({
    queryKey: ["cds-group", id],
    queryFn: () =>
      fetchApi<{
        _id: string;
        id?: string;
        name: string;
        meeting_days?: string[];
        meeting_time?: string;
        venue_name?: string;
      }>(`/api/cds-groups/${id}`),
    enabled: !!id,
  });
}

/** Dashboard stats — optional userId for member view */
export function useDashboardStats(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-stats", userId],
    queryFn: () =>
      fetchApi<{
        totalUsers: number;
        newUsersThisMonth: number;
        newUsersThisWeek: number;
        totalGroups: number;
        totalAttendance: number;
        attendanceThisMonth: number;
        attendanceToday: number;
        activeSessions: number;
        attendanceByRole: Record<string, number>;
        attendanceByGroup: Record<string, number>;
        recentAttendance: { date: string; value: number }[];
      }>(
        userId ? `/api/dashboard/stats?userId=${userId}` : "/api/dashboard/stats",
      ),
  });
}

/** User-specific stats (member dashboard) */
export function useUserStats(userId: string | null) {
  return useQuery({
    queryKey: ["user-stats", userId],
    queryFn: () =>
      fetchApi<{
        totalAttendance: number;
        attendanceThisMonth: number;
        attendanceToday: number;
        recentAttendance: { date: string; value: number }[];
      }>(`/api/dashboard/user-stats?userId=${userId}`),
    enabled: !!userId,
  });
}

/** Recent activity — limit and optional userId */
export function useRecentActivity(limit: number, userId?: string) {
  return useQuery({
    queryKey: ["recent-activity", limit, userId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (userId) params.set("userId", userId);
      return fetchApi<unknown[]>(`/api/dashboard/recent-activity?${params}`);
    },
  });
}

/** Top groups by attendance */
export function useTopGroups(limit = 5) {
  return useQuery({
    queryKey: ["top-groups", limit],
    queryFn: () =>
      fetchApi<unknown[]>(`/api/dashboard/top-groups?limit=${limit}`),
  });
}

/** Users list (admin) */
export function useUsersList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchApi<{ _id: string; id?: string; name: string; email: string; role: string }[]>("/api/users"),
  });
}

/** Single user by id */
export function useUser(id: string | null) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () =>
      fetchApi<{
        _id: string;
        name: string;
        email: string;
        state_code: string;
        role: string;
        cds_group_id?: string;
      }>(`/api/users/${id}`),
    enabled: !!id,
  });
}

/** Settings: batch attendance requirements */
export function useBatchAttendanceSettings() {
  return useQuery({
    queryKey: ["batch-attendance-settings"],
    queryFn: () =>
      fetchApi<{
        default: number;
        batchA: number | null;
        batchB: number | null;
        batchC: number | null;
      }>("/api/settings/batch-attendance"),
  });
}

/** Required attendance count — optional batch/stateCode */
export function useRequiredAttendanceCount(opts?: {
  batch?: "A" | "B" | "C";
  stateCode?: string;
}) {
  return useQuery({
    queryKey: ["required-attendance", opts],
    queryFn: () => {
      const params = new URLSearchParams();
      if (opts?.batch) params.set("batch", opts.batch);
      if (opts?.stateCode) params.set("stateCode", opts.stateCode);
      return fetchApi<number>(
        `/api/settings/required-attendance?${params.toString()}`,
      );
    },
  });
}

/** Admin assignments list */
export function useAdminAssignments() {
  return useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => fetchApi<unknown[]>("/api/admin-assignments"),
  });
}

/** Today's attendance (monitor) — polls every 10s for near real-time updates */
export function useTodayAttendance() {
  return useQuery({
    queryKey: ["today-attendance"],
    queryFn: () => fetchApi<unknown[]>("/api/attendance/today"),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** User attendance history */
export function useUserAttendanceHistory(userId: string | null, limit = 100) {
  return useQuery({
    queryKey: ["user-attendance-history", userId, limit],
    queryFn: () =>
      fetchApi<unknown[]>(
        `/api/attendance/user-history?userId=${userId}&limit=${limit}`,
      ),
    enabled: !!userId,
  });
}

/** All active QR sessions (admin) — polls every 10s for near real-time updates */
export function useAllActiveQr() {
  return useQuery({
    queryKey: ["all-active-qr"],
    queryFn: () =>
      fetchApi<
        {
          meetingId: string;
          sessionId: string | null;
          token: string | null;
          attendanceCount: number;
          adminName: string;
        }[]
      >("/api/qr/all-active"),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** Today's meeting date (display) */
export function useTodayMeetingDate() {
  return useQuery({
    queryKey: ["today-meeting-date"],
    queryFn: () => fetchApi<string>("/api/qr/today-meeting-date"),
  });
}

/** Active QR for a specific meeting */
export function useActiveQr(meetingId: string | null) {
  return useQuery({
    queryKey: ["active-qr", meetingId],
    queryFn: () =>
      fetchApi<{
        token: string | null;
        attendanceCount: number;
        sessionId: string | null;
        meetingId: string;
        adminName: string;
      } | null>(`/api/qr/active/${meetingId}`),
    enabled: !!meetingId,
  });
}

/** My active sessions (admin dashboard) */
export function useMyActiveSessions(sessionToken: string | null) {
  return useQuery({
    queryKey: ["my-active-sessions"],
    queryFn: () => fetchApi<unknown[]>("/api/qr/my-active-sessions"),
    enabled: !!sessionToken,
  });
}

/** Today's groups for admin */
export function useTodayGroups(sessionToken: string | null) {
  return useQuery({
    queryKey: ["today-groups"],
    queryFn: () => fetchApi<unknown>("/api/qr/today-groups"),
    enabled: !!sessionToken,
  });
}

/** Documentation: list links by type (admin) */
export function useDocumentationListLinks(
  sessionToken: string | null,
  type: DocumentationType,
) {
  return useQuery({
    queryKey: ["documentation-links", type],
    queryFn: () =>
      fetchApi<unknown[]>(`/api/documentation/links?type=${type}`),
    enabled: !!sessionToken && !!type,
  });
}

/** Documentation: validate public link (token + type) */
export function useDocumentationValidateLink(
  token: string | null,
  type: DocumentationType,
) {
  return useQuery({
    queryKey: ["documentation-validate", token, type],
    queryFn: () =>
      fetchApi<{ token: string; type: string; status: string; created_at: number } | null>(
        `/api/documentation/validate?token=${token}&type=${type}`,
      ),
    enabled: !!token && !!type,
  });
}

/** Documentation: list corp member requests (admin) — polls every 30s for new requests */
export function useDocumentationListCorpMemberRequests(
  sessionToken: string | null,
) {
  return useQuery({
    queryKey: ["documentation-corp-member-requests"],
    queryFn: () => fetchApi<unknown[]>("/api/documentation/corp-member-requests"),
    enabled: !!sessionToken,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Documentation: list corp members (admin) */
export function useDocumentationListCorpMembers(sessionToken: string | null) {
  return useQuery({
    queryKey: ["documentation-corp-members"],
    queryFn: () => fetchApi<unknown[]>("/api/documentation/corp-members"),
    enabled: !!sessionToken,
  });
}

/** Documentation: list employers (admin) */
export function useDocumentationListEmployers(sessionToken: string | null) {
  return useQuery({
    queryKey: ["documentation-employers"],
    queryFn: () => fetchApi<unknown[]>("/api/documentation/employers"),
    enabled: !!sessionToken,
  });
}

/** Documentation: list rejected reposting (admin) */
export function useDocumentationListRejectedReposting(
  sessionToken: string | null,
) {
  return useQuery({
    queryKey: ["documentation-rejected-reposting"],
    queryFn: () =>
      fetchApi<unknown[]>("/api/documentation/rejected-reposting"),
    enabled: !!sessionToken,
  });
}

/** Documentation: get corp member doc by link token (public SAED page) */
export function useDocumentationCorpMemberByLinkToken(linkToken: string | null) {
  return useQuery({
    queryKey: ["documentation-corp-member-by-link", linkToken],
    queryFn: () =>
      fetchApi<{
        _id: string;
        full_name: string;
        state_code: string;
        personal_skill?: string;
        saed_camp_skill?: string;
        proposed_post_camp_saed_skill?: string;
        selected_trainer_name?: string;
        selected_trainer_business?: string;
        selected_trainer_phone?: string;
        selected_trainer_email?: string;
      } | null>(
        `/api/documentation/corp-member-by-link?linkToken=${linkToken}`,
      ),
    enabled: !!linkToken,
  });
}
