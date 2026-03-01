"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateQrToken, getNextRotationTime } from "@/lib/qr-token-generator";

interface SessionData {
  secret: string;
  rotationInterval: number;
  meetingDate: string;
  isActive: boolean;
}

async function fetchSessionSecret(meetingId: string): Promise<SessionData | null> {
  const res = await fetch(`/api/qr/session-secret?meetingId=${meetingId}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Hook to manage QR session with client-side token generation
 *
 * Fetches session secret once (cached), then generates tokens locally
 * Rotates tokens automatically based on rotation interval
 *
 * @param meetingId - Meeting ID to get session for
 * @returns Current token, rotation count, and session data
 */
export function useQrSession(meetingId: string | null) {
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [rotationCount, setRotationCount] = useState(0);
  const [nextRotationTime, setNextRotationTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWindowRef = useRef<number | null>(null);

  const { data: sessionData } = useQuery({
    queryKey: ["qr-session-secret", meetingId],
    queryFn: () => fetchSessionSecret(meetingId!),
    enabled: !!meetingId,
  });

  useEffect(() => {
    if (!sessionData?.secret || !sessionData.isActive) {
      setCurrentToken(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const rotationInterval = sessionData.rotationInterval || 50;

    const generateAndRotate = async () => {
      const now = Date.now();
      const currentWindow =
        Math.floor(now / 1000 / rotationInterval) * rotationInterval;

      if (lastWindowRef.current !== currentWindow) {
        try {
          const token = await generateQrToken(
            sessionData.secret,
            now,
            rotationInterval,
          );
          setCurrentToken(token);
          setRotationCount((prev) => prev + 1);
          lastWindowRef.current = currentWindow;

          const nextRotation = getNextRotationTime(now, rotationInterval);
          setNextRotationTime(nextRotation);
        } catch (error) {
          console.error("Failed to generate QR token:", error);
        }
      }
    };

    generateAndRotate();

    intervalRef.current = setInterval(() => {
      generateAndRotate();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionData]);

  return {
    currentToken,
    rotationCount,
    nextRotationTime,
    sessionData: sessionData
      ? {
          meetingDate: sessionData.meetingDate,
          isActive: sessionData.isActive,
          rotationInterval: sessionData.rotationInterval || 50,
        }
      : null,
    isLoading: sessionData === undefined && !!meetingId,
  };
}
