"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { getSessionAction } from "@/app/actions/session";

export function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin and if notifications are enabled
    (async () => {
      try {
        const session = await getSessionAction();
        if (session && (session.user.role === "admin" || session.user.role === "super_admin")) {
          setIsAdmin(true);
          
          // Check notification permission status
          if ("Notification" in window) {
            const permission = Notification.permission;
            // Show banner if permission is default (not yet requested) or denied
            if (permission === "default" || permission === "denied") {
              // Check if user has dismissed the banner before (using localStorage)
              const dismissed = localStorage.getItem("notification-banner-dismissed");
              if (!dismissed) {
                setShowBanner(true);
              }
            }
          }
        }
      } catch (error) {
        // Not logged in or not admin
        setIsAdmin(false);
      }
    })();
  }, []);

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setShowBanner(false);
        localStorage.setItem("notification-banner-dismissed", "true");
      } else if (permission === "denied") {
        alert("Notifications are blocked. Please enable them in your browser settings.");
        setShowBanner(false);
        localStorage.setItem("notification-banner-dismissed", "true");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  if (!showBanner || !isAdmin) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <div>
            <p className="font-medium">Enable browser notifications</p>
            <p className="text-sm text-blue-100">
              Get instant alerts when employers submit corp member requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEnableNotifications}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            Enable
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
