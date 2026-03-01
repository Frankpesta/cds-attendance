"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { SocketNotifications } from "@/components/pusher/PusherNotifications";
import { NotificationPermissionBanner } from "@/components/pusher/NotificationPermissionBanner";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotificationPermissionBanner />
        <SocketNotifications />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
