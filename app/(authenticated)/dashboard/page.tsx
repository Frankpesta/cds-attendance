"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { startQrAction } from "@/app/actions/qr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessionAction } from "@/app/actions/session";
import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable } from "@/components/ui/data-table";
import { Chart, BarChart, PieChart } from "@/components/ui/chart";
import { Users, UserCheck, Building2, Activity, TrendingUp, Calendar, Clock, Target } from "lucide-react";

export default function Dashboard() {
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const [sessionToken, setSessionToken] = useState("");
  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
      if (s?.session?.session_token) {
        setSessionToken(s.session.session_token);
      }
    })();
  }, []);

  if (session === undefined) return <div className="p-6">Loading...</div>;
  if (!session) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  const role = session.user.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {role === "super_admin" && "Super Admin Dashboard"}
          {role === "admin" && "Admin Dashboard"}
          {role === "corps_member" && "My Dashboard"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {role === "super_admin" && "Welcome back! Manage the entire CDS attendance system and oversee all operations."}
          {role === "admin" && "Welcome back! Manage your assigned CDS groups and track attendance for your members."}
          {role === "corps_member" && `Welcome back, ${session.user.name}! Track your attendance and view your CDS activities.`}
        </p>
      </div>

      {role === "super_admin" && <SuperAdminHome />}
      {role === "admin" && <AdminHome sessionToken={sessionToken} />}
      {role === "corps_member" && <MemberHome userId={session.user._id} />}
    </div>
  );
}

function SuperAdminHome() {
  const stats = useQuery(api.dashboard.getStats, {});
  const recentActivity = useQuery(api.dashboard.getRecentActivity, { limit: 5 });
  const topGroups = useQuery(api.dashboard.getTopGroups, { limit: 5 });

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          change={{
            value: Math.round((stats.newUsersThisMonth / Math.max(stats.totalUsers - stats.newUsersThisMonth, 1)) * 100),
            label: "vs last month",
            type: stats.newUsersThisMonth > 0 ? "positive" : "neutral"
          }}
          icon={Users}
          description={`${stats.newUsersThisWeek} new this week`}
        />
        <MetricCard
          title="CDS Groups"
          value={stats.totalGroups}
          icon={Building2}
          description="Active groups"
        />
        <MetricCard
          title="Total Attendance"
          value={stats.totalAttendance}
          change={{
            value: Math.round((stats.attendanceThisMonth / Math.max(stats.totalAttendance - stats.attendanceThisMonth, 1)) * 100),
            label: "vs last month",
            type: stats.attendanceThisMonth > 0 ? "positive" : "neutral"
          }}
          icon={UserCheck}
          description={`${stats.attendanceToday} today`}
        />
        <MetricCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon={Activity}
          description="QR sessions running"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Chart title="Attendance Trend" description="Last 7 days">
          <BarChart 
            data={stats.recentAttendance.map((item: any) => ({
              label: item.date,
              value: Number(item.value),
              color: "#008751"
            }))}
          />
        </Chart>
        
        <Chart title="Attendance by Role" description="Distribution of attendance records">
          <PieChart 
            data={Object.entries(stats.attendanceByRole).map(([role, count], index) => ({
              label: role.replace('_', ' ').toUpperCase(),
              value: Number(count),
              color: index === 0 ? "#008751" : index === 1 ? "#10b981" : "#6b7280"
            }))}
          />
        </Chart>
      </div>

      {/* Data Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Recent Activity"
          description="Latest attendance records"
          data={recentActivity || []}
          columns={[
            { key: "user", label: "User" },
            { key: "group", label: "CDS Group" },
            { 
              key: "timestamp", 
              label: "Time",
              render: (value) => new Date(value).toLocaleString()
            },
            { 
              key: "type", 
              label: "Type",
              render: (value) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  {value}
                </span>
              )
            }
          ]}
        />

        <DataTable
          title="Top CDS Groups"
          description="Groups by attendance count"
          data={topGroups || []}
          columns={[
            { key: "name", label: "Group Name" },
            { key: "attendanceCount", label: "Attendance" },
            { 
              key: "meetingDays", 
              label: "Meeting Days",
              render: (value) => value.join(", ")
            },
            { key: "meetingTime", label: "Time" }
          ]}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Manage your CDS system</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/groups">
              <Button variant="primary">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="secondary">
                <Users className="w-4 h-4 mr-2" />
                Onboard Members
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminHome({ sessionToken }: { sessionToken: string }) {
  const getToday = useQuery(api.qr.getTodayGroups, { sessionToken });
  const stats = useQuery(api.dashboard.getStats, {});
  const recentActivity = useQuery(api.dashboard.getRecentActivity, { limit: 5 });
  const [error, setError] = useState<string | null>(null);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Attendance"
          value={stats.attendanceToday}
          icon={UserCheck}
          description="Attendance marked today"
        />
        <MetricCard
          title="Groups Meeting Today"
          value={getToday ? (Array.isArray(getToday) ? getToday.length : getToday.meetingToday.length) : 0}
          icon={Calendar}
          description="CDS groups with meetings"
        />
        <MetricCard
          title="Active QR Sessions"
          value={stats.activeSessions}
          icon={Activity}
          description="Currently running"
        />
        <MetricCard
          title="This Month's Attendance"
          value={stats.attendanceThisMonth}
          icon={TrendingUp}
          description="Total this month"
        />
      </div>

      {/* QR Session Management */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">QR Session Management</h3>
          <p className="text-sm text-muted-foreground">Start and manage attendance sessions</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={async () => {
                setError(null);
                try {
                  const res = await startQrAction();
                  if (!res.ok) throw new Error(res.error);
                  window.location.href = "/qr";
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Failed to start QR");
                }
              }}
            >
              <Activity className="w-4 h-4 mr-2" />
              Start QR Session
            </Button>
            <Link href="/qr">
              <Button variant="secondary">
                <Target className="w-4 h-4 mr-2" />
                View QR Display
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="secondary">
                <Users className="w-4 h-4 mr-2" />
                Onboard Members
              </Button>
            </Link>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Groups meeting today: <span className="font-medium">{getToday ? (Array.isArray(getToday) ? getToday.length : getToday.meetingToday.length) : 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <DataTable
        title="Recent Attendance"
        description="Latest attendance records from your sessions"
        data={recentActivity || []}
        columns={[
          { key: "user", label: "Member" },
          { key: "group", label: "CDS Group" },
          { 
            key: "timestamp", 
            label: "Time",
            render: (value) => new Date(value).toLocaleString()
          },
          { 
            key: "type", 
            label: "Status",
            render: (value) => (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                {value}
              </span>
            )
          }
        ]}
      />
    </div>
  );
}

function MemberHome({ userId }: { userId: any }) {
  const stats = useQuery(api.dashboard.getUserStats, { userId });
  const recentActivity = useQuery(api.dashboard.getRecentActivity, { limit: 10, userId });

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="My Attendance Today"
          value={stats.attendanceToday}
          icon={UserCheck}
          description="Attendance marked today"
        />
        <MetricCard
          title="This Month"
          value={stats.attendanceThisMonth}
          icon={Calendar}
          description="Total attendance this month"
        />
        <MetricCard
          title="Total Attendance"
          value={stats.totalAttendance}
          icon={TrendingUp}
          description="All-time attendance"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Mark your attendance and view your records</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/scan">
              <Button variant="primary">
                <UserCheck className="w-4 h-4 mr-2" />
                Mark Attendance
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2" />
                View My Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* My Recent Activity */}
      <DataTable
        title="My Recent Attendance"
        description="Your latest attendance records"
        data={recentActivity || []}
        columns={[
          { key: "group", label: "CDS Group" },
          { 
            key: "timestamp", 
            label: "Date & Time",
            render: (value) => new Date(value).toLocaleString()
          },
          { 
            key: "type", 
            label: "Status",
            render: (value) => (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                {value}
              </span>
            )
          }
        ]}
      />
    </div>
  );
}


