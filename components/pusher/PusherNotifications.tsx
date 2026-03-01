"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionToken } from "@/hooks/useSessionToken";
import { useDocumentationListCorpMemberRequests } from "@/hooks/useApiQueries";
import { getSessionAction } from "@/app/actions/session";

/** Polls corp member requests and shows browser notification when count increases (admin only). */
export function SocketNotifications() {
  const router = useRouter();
  const sessionToken = useSessionToken();
  const [isAdmin, setIsAdmin] = useState(false);
  const prevCountRef = useRef<number | null>(null);

  const { data: requests = [] } = useDocumentationListCorpMemberRequests(
    isAdmin ? sessionToken : null,
  );

  useEffect(() => {
    (async () => {
      try {
        const session = await getSessionAction();
        if (
          session &&
          (session.user.role === "admin" || session.user.role === "super_admin")
        ) {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin || !Array.isArray(requests)) return;

    const count = requests.length;
    const prev = prevCountRef.current;

    if (prev !== null && count > prev && prev >= 0) {
      if ("Notification" in window && Notification.permission === "granted") {
        const latest = requests[count - 1] as {
          ppa_name?: string;
          number_of_corp_members_requested?: number;
        } | undefined;
        const notification = new Notification("New Corp Member Request", {
          body: `${latest?.ppa_name || "Unknown"} has requested ${latest?.number_of_corp_members_requested ?? 0} corp member(s)`,
          icon: "/nysc-seeklogo.svg",
          tag: "corp-member-request",
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          router.push("/documentation/corp-member-requests");
          notification.close();
        };
      }
    }

    prevCountRef.current = count;
  }, [requests, isAdmin, router]);

  return null;
}
