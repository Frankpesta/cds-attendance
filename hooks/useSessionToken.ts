"use client";

import { useEffect, useState } from "react";
import { getSessionTokenAction } from "@/app/actions/session";

export function useSessionToken() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      try {
        const token = await getSessionTokenAction();
        if (mounted) {
          setSessionToken(token);
        }
      } catch (error) {
        console.error("Error fetching session token:", error);
        if (mounted) {
          setSessionToken(null);
        }
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  return sessionToken;
}
