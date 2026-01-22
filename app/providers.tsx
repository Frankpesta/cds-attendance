"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useMemo } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { PusherNotifications } from "@/components/pusher/PusherNotifications";
import { NotificationPermissionBanner } from "@/components/pusher/NotificationPermissionBanner";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Create a query client with caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(convexUrl || ""), []);
  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProvider client={client}>
        <ToastProvider>
          <NotificationPermissionBanner />
          <PusherNotifications />
          {children}
        </ToastProvider>
      </ConvexProvider>
    </QueryClientProvider>
  );
}


