"use client";

import { useEffect, useState } from "react";

export function useSessionToken() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const getToken = () => {
      try {
        const cookies = document.cookie.split(";").map((s) => s.trim());
        const sessionCookie = cookies.find((s) => s.startsWith("session_token="));
        if (sessionCookie) {
          const token = sessionCookie.split("=").slice(1).join("="); // Handle tokens with = in them
          return decodeURIComponent(token) || null;
        }
      } catch (error) {
        console.error("Error reading session token:", error);
      }
      return null;
    };

    // Get token immediately
    const token = getToken();
    setSessionToken(token);

    // Also check after a short delay in case cookies aren't ready yet
    const timeout = setTimeout(() => {
      const delayedToken = getToken();
      if (delayedToken && !token) {
        setSessionToken(delayedToken);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return sessionToken;
}
