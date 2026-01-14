"use client";
import { useEffect, useState } from "react";
import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function usePusher() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

    if (!pusherKey) {
      console.warn("Pusher key not configured");
      return;
    }

    if (!pusherClient) {
      pusherClient = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: "/api/pusher/auth",
      });
    }

    pusherClient.connection.bind("connected", () => {
      setIsConnected(true);
    });

    pusherClient.connection.bind("disconnected", () => {
      setIsConnected(false);
    });

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  const subscribe = (channel: string, event: string, callback: (data: any) => void) => {
    if (!pusherClient) return () => {};

    const channelInstance = pusherClient.subscribe(channel);
    channelInstance.bind(event, callback);

    return () => {
      channelInstance.unbind(event, callback);
      pusherClient?.unsubscribe(channel);
    };
  };

  const unsubscribe = (channel: string) => {
    if (!pusherClient) return;
    pusherClient.unsubscribe(channel);
  };

  return {
    isConnected,
    subscribe,
    unsubscribe,
    pusher: pusherClient,
  };
}
