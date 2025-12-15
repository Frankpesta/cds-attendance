"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

  // Fetch real-time attendance data
  const todayAttendance = useQuery(api.attendance.getTodayAttendance, {});
  const meetingDate = new Date().toISOString().split('T')[0];
  const allActiveQrSessions = useQuery(api.qr.getAllActiveQr, { meetingDate });
  // Use first active session for notifications (or any active session)
  const activeQrSession = allActiveQrSessions && allActiveQrSessions.length > 0 ? allActiveQrSessions[0] : null;

  // Generate notifications based on attendance changes
  useEffect(() => {
    if (!todayAttendance) return;

    const currentCount = todayAttendance.length;
    
    if (lastAttendanceCount > 0 && currentCount > lastAttendanceCount) {
      const newAttendance = todayAttendance.slice(-(currentCount - lastAttendanceCount));
      
      newAttendance.forEach(record => {
        if (record.status === "present") {
          const notification: Notification = {
            id: `attendance-${record._id}-${Date.now()}`,
            type: "attendance",
            title: "New Attendance Marked",
            message: `A member has marked attendance at ${new Date(record.scanned_at).toLocaleTimeString()}`,
            timestamp: record.scanned_at,
            read: false,
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
        }
      });
    }
    
    setLastAttendanceCount(currentCount);
  }, [todayAttendance, lastAttendanceCount]);

  // Generate QR session notifications
  useEffect(() => {
    if (activeQrSession) {
      const notification: Notification = {
        id: `qr-session-${Date.now()}`,
        type: "attendance",
        title: "QR Session Active",
        message: `QR code session is now active. Token: ${activeQrSession.token.substring(0, 8)}...`,
        timestamp: Date.now(),
        read: false,
      };
      
      setNotifications(prev => {
        // Check if we already have a notification for this session
        const existingSessionNotification = prev.find(n => 
          n.title === "QR Session Active" && 
          (Date.now() - n.timestamp) < 5000 // Within last 5 seconds
        );
        
        if (existingSessionNotification) return prev;
        
        return [notification, ...prev.slice(0, 49)];
      });
    }
  }, [activeQrSession]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
  }, []);

  return {
    notifications,
    markAsRead,
    clearAll,
    addNotification,
    unreadCount: notifications.filter(n => !n.read).length,
  };
};
