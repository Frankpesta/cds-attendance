"use client";
import { useState, useEffect, useCallback } from "react";
import { useTodayAttendance, useAllActiveQr } from "@/hooks/useApiQueries";

interface Notification {
  id: string;
  type: "attendance" | "error" | "warning";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export const useRealtimeAttendance = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastAttendanceCount, setLastAttendanceCount] = useState(0);

  const { data: todayAttendance = [] } = useTodayAttendance();
  const { data: allActiveQrSessions = [] } = useAllActiveQr();
  const activeQrSession =
    Array.isArray(allActiveQrSessions) && allActiveQrSessions.length > 0
      ? allActiveQrSessions[0]
      : null;

  useEffect(() => {
    if (!todayAttendance || !Array.isArray(todayAttendance)) return;

    const currentCount = todayAttendance.length;

    if (lastAttendanceCount > 0 && currentCount > lastAttendanceCount) {
      const newAttendance = todayAttendance.slice(
        -(currentCount - lastAttendanceCount),
      );

      (newAttendance as { _id?: string; status?: string; scanned_at?: number }[]).forEach((record) => {
        if (record.status === "present") {
          const notification: Notification = {
            id: `attendance-${record._id ?? record}-${Date.now()}`,
            type: "attendance",
            title: "New Attendance Marked",
            message: `A member has marked attendance at ${new Date(record.scanned_at ?? 0).toLocaleTimeString()}`,
            timestamp: record.scanned_at ?? Date.now(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
        }
      });
    }

    setLastAttendanceCount(currentCount);
  }, [todayAttendance, lastAttendanceCount]);

  useEffect(() => {
    if (activeQrSession && typeof activeQrSession === "object") {
      const session = activeQrSession as {
        token?: string;
        sessionId?: string;
      };
      const tokenDisplay = session.token
        ? `${session.token.substring(0, 8)}...`
        : session.sessionId
          ? `Session ${session.sessionId.substring(0, 8)}...`
          : "Active";

      const notification: Notification = {
        id: `qr-session-${Date.now()}`,
        type: "attendance",
        title: "QR Session Active",
        message: `QR code session is now active. ${tokenDisplay}`,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => {
        const existingSessionNotification = prev.find(
          (n) =>
            n.title === "QR Session Active" &&
            Date.now() - n.timestamp < 5000,
        );

        if (existingSessionNotification) return prev;

        return [notification, ...prev.slice(0, 49)];
      });
    }
  }, [activeQrSession]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification,
      ),
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
    },
    [],
  );

  return {
    notifications,
    markAsRead,
    clearAll,
    addNotification,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
};
