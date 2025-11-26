"use client";

import { useEffect, useState } from "react";

export function useSessionToken() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const token =
      document.cookie
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("session_token="))
        ?.split("=")[1] || null;
    setSessionToken(token);
  }, []);

  return sessionToken;
}
