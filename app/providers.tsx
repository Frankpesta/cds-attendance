"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useMemo, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { PusherNotifications } from "@/components/pusher/PusherNotifications";
import { NotificationPermissionBanner } from "@/components/pusher/NotificationPermissionBanner";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

export default function Providers({ children }: { children: ReactNode }) {
  const convexClient = useMemo(() => new ConvexReactClient(convexUrl), []);
  const convexQueryClient = useMemo(
    () => new ConvexQueryClient(convexClient),
    [convexClient]
  );
  const [queryClient] = useState(() => {
    const q = new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
          staleTime: Number.POSITIVE_INFINITY, // Convex pushes updates; no refetch needed
          gcTime: 5 * 60 * 1000, // 5 min after unmount keep subscription
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    });
    convexQueryClient.connect(q);
    return q;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProvider client={convexClient}>
        <ToastProvider>
          <NotificationPermissionBanner />
          <PusherNotifications />
          {children}
        </ToastProvider>
      </ConvexProvider>
    </QueryClientProvider>
  );
}


