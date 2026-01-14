"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { PusherNotifications } from "@/components/pusher/PusherNotifications";
import { NotificationPermissionBanner } from "@/components/pusher/NotificationPermissionBanner";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(convexUrl || ""), []);
  return (
    <ConvexProvider client={client}>
      <ToastProvider>
        <NotificationPermissionBanner />
        <PusherNotifications />
        {children}
      </ToastProvider>
    </ConvexProvider>
  );
}


