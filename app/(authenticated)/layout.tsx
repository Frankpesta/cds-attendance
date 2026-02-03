"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionAction } from "../actions/session";
import { Home, Building2, QrCode, Scan, UserPlus, BarChart3, Users, UserCheck, Calendar, Activity, Shield, FileText } from "lucide-react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    }
  }, [session, router]);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const role = session.user.role;
  const nav = 
    role === "super_admin"
      ? [
          { label: "Dashboard", href: "/dashboard", icon: Home },
          { label: "Users", href: "/users", icon: Users },
          { label: "Groups", href: "/groups", icon: Building2 },
          { label: "Admin Assignments", href: "/admin-assignments", icon: UserCheck },
          { label: "Reports", href: "/reports", icon: BarChart3 },
          { label: "Documentation", href: "/documentation", icon: FileText },
          { label: "Settings", href: "/settings", icon: Shield },
        ]
      : role === "admin"
      ? [
          { label: "Dashboard", href: "/dashboard", icon: Home },
          { label: "QR", href: "/qr", icon: QrCode },
          { label: "Live Monitor", href: "/attendance-monitor", icon: Activity },
          { label: "Documentation", href: "/documentation", icon: FileText },
        ]
      : [
          { label: "Dashboard", href: "/dashboard", icon: Home },
          { label: "Scan", href: "/scan", icon: Scan },
          { label: "Attendance History", href: "/attendance-history", icon: Calendar },
          { label: "CDS Clearance", href: "/clearance", icon: FileText },
        ];

  return (
    <AppShell nav={nav} user={session.user}>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>}>
        {children}
      </Suspense>
    </AppShell>
  );
}
