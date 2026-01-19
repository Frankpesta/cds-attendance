"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function usePusher() {
  const [isConnected, setIsConnected] = useState(false);
  const connectionHandlersBound = useRef(false);

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

    // Only bind connection handlers once
    if (!connectionHandlersBound.current) {
      pusherClient.connection.bind("connected", () => {
        setIsConnected(true);
      });

      pusherClient.connection.bind("disconnected", () => {
        setIsConnected(false);
      });

      pusherClient.connection.bind("error", (err: any) => {
        console.error("Pusher connection error:", err);
      });

      connectionHandlersBound.current = true;
    }

    // Check if already connected
    if (pusherClient.connection.state === "connected") {
      setIsConnected(true);
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  const subscribe = useCallback((channel: string, event: string, callback: (data: any) => void) => {
    if (!pusherClient) return () => {};

    const channelInstance = pusherClient.subscribe(channel);
    
    channelInstance.bind("pusher:subscription_error", (err: any) => {
      console.error(`Pusher: Subscription error for channel "${channel}":`, err);
    });

    channelInstance.bind(event, callback);

    return () => {
      channelInstance.unbind(event, callback);
      pusherClient?.unsubscribe(channel);
    };
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (!pusherClient) return;
    pusherClient.unsubscribe(channel);
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    pusher: pusherClient,
  };
}
