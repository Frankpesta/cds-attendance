"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useRealtimeAttendance } from "@/hooks/useRealtimeAttendance";
import { Sun, Moon, Menu, X, LogOut, Home, Building2, QrCode, Scan, FileText, UserPlus, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { logoutAction } from "@/app/actions/auth";

type NavItem = { label: string; href: string; icon?: React.ComponentType<{ className?: string }> };

export function AppShell({ nav, children, user }: { nav: NavItem[]; children: React.ReactNode; user?: any }) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { notifications, markAsRead, clearAll } = useRealtimeAttendance();
  
  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
        open ? "translate-x-0" : "-translate-x-full",
        "border-r bg-card flex flex-col"
      )}> 
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <div className="text-lg font-semibold font-sans">
            {user?.role === "super_admin" && "CDS Super Admin"}
            {user?.role === "admin" && "CDS Admin"}
            {user?.role === "corps_member" && "CDS Member"}
            {!user && "CDS System"}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden" 
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
        <nav className="flex-1 p-6 space-y-3">
          {nav.map((n) => (
            <a 
              key={n.href} 
              href={n.href} 
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
              onClick={() => setOpen(false)}
            >
              {n.icon && (
                <n.icon className="h-5 w-5 mr-3 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
              )}
              {n.label}
            </a>
          ))}
        </nav>
        
        {/* Logout button in sidebar footer */}
        <div className="p-6 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 px-4 py-3"
            onClick={async () => {
              await logoutAction();
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden" 
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold font-sans">
              {/* NYSC CDS Attendance • {user?.role === "super_admin" && "Super Admin"}
              {user?.role === "admin" && "Admin"}
              {user?.role === "corps_member" && "Member"}
              {!user && "System"} */}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell 
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onClearAll={clearAll}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t bg-background px-6 py-4">
          <p className="text-xs text-muted-foreground text-center font-sans">
            NYSC CDS Attendance • Akure South LGA
          </p>
        </footer>
      </div>
    </div>
  );
}