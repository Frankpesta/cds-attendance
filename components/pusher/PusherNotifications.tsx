"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePusher } from "@/hooks/usePusher";
import { getSessionAction } from "@/app/actions/session";

export function PusherNotifications() {
  const router = useRouter();
  const { subscribe, isConnected } = usePusher();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    (async () => {
      try {
        const session = await getSessionAction();
        if (session && (session.user.role === "admin" || session.user.role === "super_admin")) {
          setIsAdmin(true);
        }
      } catch (error) {
        // Not logged in or not admin
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isConnected || !isAdmin) return;

    const unsubscribe = subscribe("admin-notifications", "corp-member-request", (data: any) => {
      // Request browser notification permission
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("New Corp Member Request", {
          body: `${data.ppa_name} has requested ${data.number_requested} corp member(s)`,
          icon: "/nysc-seeklogo.svg",
          tag: "corp-member-request",
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          router.push("/documentation/corp-member-requests");
          notification.close();
        };
      } else if ("Notification" in window && Notification.permission === "default") {
        // Request permission
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            const notification = new Notification("New Corp Member Request", {
              body: `${data.ppa_name} has requested ${data.number_requested} corp member(s)`,
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
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isConnected, isAdmin, subscribe, router]);

  return null;
}
