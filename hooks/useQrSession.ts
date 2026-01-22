"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { generateQrToken, getNextRotationTime } from "@/lib/qr-token-generator";

interface SessionData {
  secret: string;
  rotationInterval: number;
  meetingDate: string;
  isActive: boolean;
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

  // Fetch session secret (cached by Convex, only fetched once per session)
  const sessionData = useQuery(
    api.qr.getSessionSecret,
    meetingId ? { meetingId: meetingId as any } : "skip"
  ) as SessionData | undefined | null;

  useEffect(() => {
    if (!sessionData?.secret || !sessionData.isActive) {
      // Clear token if session is invalid
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
      const currentWindow = Math.floor(now / 1000 / rotationInterval) * rotationInterval;
      
      // Only generate new token if we've moved to a new time window
      if (lastWindowRef.current !== currentWindow) {
        try {
          const token = await generateQrToken(
            sessionData.secret,
            now,
            rotationInterval
          );
          setCurrentToken(token);
          setRotationCount(prev => prev + 1);
          lastWindowRef.current = currentWindow;
          
          // Calculate next rotation time
          const nextRotation = getNextRotationTime(now, rotationInterval);
          setNextRotationTime(nextRotation);
        } catch (error) {
          console.error("Failed to generate QR token:", error);
        }
      }
    };

    // Generate immediately
    generateAndRotate();

    // Set up interval to check for rotation (check every second to catch window changes)
    intervalRef.current = setInterval(() => {
      generateAndRotate();
    }, 1000); // Check every second

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
    sessionData: sessionData ? {
      meetingDate: sessionData.meetingDate,
      isActive: sessionData.isActive,
      rotationInterval: sessionData.rotationInterval || 50,
    } : null,
    isLoading: sessionData === undefined,
  };
}
