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

      pusherClient.connection.bind("connected", () => {
        console.log("Pusher: Connected");
        setIsConnected(true);
      });

      pusherClient.connection.bind("disconnected", () => {
        console.log("Pusher: Disconnected");
        setIsConnected(false);
      });

      pusherClient.connection.bind("error", (err: any) => {
        console.error("Pusher connection error:", err);
      });
    }

    // Check if already connected
    if (pusherClient.connection.state === "connected") {
      setIsConnected(true);
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  const subscribe = (channel: string, event: string, callback: (data: any) => void) => {
    if (!pusherClient) {
      console.warn("Pusher: Cannot subscribe, client not initialized");
      return () => {};
    }

    console.log(`Pusher: Subscribing to channel "${channel}", event "${event}"`);
    
    const channelInstance = pusherClient.subscribe(channel);
    
    channelInstance.bind("pusher:subscription_succeeded", () => {
      console.log(`Pusher: Successfully subscribed to channel "${channel}"`);
    });

    channelInstance.bind("pusher:subscription_error", (err: any) => {
      console.error(`Pusher: Subscription error for channel "${channel}":`, err);
    });

    channelInstance.bind(event, (data: any) => {
      console.log(`Pusher: Received event "${event}" on channel "${channel}":`, data);
      callback(data);
    });

    return () => {
      console.log(`Pusher: Unsubscribing from channel "${channel}"`);
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
