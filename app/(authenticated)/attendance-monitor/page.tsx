"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { 
  Users, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Activity,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export default function AttendanceMonitorPage() {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { push } = useToast();

  // Fetch real-time data
  const todayAttendance = useQuery(api.attendance.getTodayAttendance, {});
  const cdsGroups = useQuery(api.cds_groups.list, {});
  const activeQrSession = useQuery(api.qr.getActiveQr, { meetingDate: new Date().toISOString().split('T')[0] });
  const attendanceStats = useQuery(api.dashboard.getStats, {});

  // Filter attendance by selected group
  const filteredAttendance = todayAttendance?.filter((record: any) => 
    !selectedGroup || record.cds_group_id === selectedGroup
  ) || [];

  // Calculate real-time statistics
  const totalMembers = filteredAttendance.length;
  const presentCount = filteredAttendance.filter((record: any) => record.status === "present").length;
  const absentCount = totalMembers - presentCount;
  const attendanceRate = totalMembers > 0 ? ((presentCount / totalMembers) * 100).toFixed(1) : "0";

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Convex queries will automatically refresh
      console.log("Refreshing attendance data...");
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const groupOptions = cdsGroups?.map((group: { _id: string; name: string }) => ({
    value: group._id,
    label: group.name
  })) || [];

  const getStatusIcon = (status: string) => {
    return status === "present" ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getLocationStatus = (record: any) => {
    if (record.location_verified) {
      return (
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <MapPin className="w-3 h-3" />
          <span>Verified</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-yellow-600 text-sm">
        <AlertTriangle className="w-3 h-3" />
        <span>Not verified</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Attendance Monitor</h1>
          <p className="text-muted-foreground">Real-time attendance tracking and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">{attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <h2 className="text-xl font-semibold">QR Session Status</h2>
          </div>
        </CardHeader>
        <CardContent>
          {activeQrSession ? (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-green-800">QR Session Active</p>
                  <p className="text-sm text-green-600">
                    Token: {activeQrSession.token.substring(0, 8)}... • 
                    Rotations: {activeQrSession.rotation || 0}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-red-800">No Active QR Session</p>
                  <p className="text-sm text-red-600">Start a QR session to begin attendance tracking</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Filters</h2>
          <p className="text-sm text-muted-foreground">Filter attendance records by CDS group</p>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              options={[{ value: "", label: "All groups" }, ...groupOptions]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Attendance Records */}
      <DataTable
        title="Live Attendance Records"
        description={`${filteredAttendance.length} records • Last updated: ${new Date().toLocaleTimeString()}`}
        data={filteredAttendance}
        columns={[
          { 
            key: "user_name", 
            label: "Member",
            render: (value: any, item: any) => {
              // This would need to be populated from user data
              return `User ${item.user_id.substring(0, 8)}...`;
            }
          },
          { 
            key: "group_name", 
            label: "CDS Group",
            render: (value: any, item: any) => {
              const group = cdsGroups?.find((g: { _id: string; name: string }) => g._id === item.cds_group_id);
              return group ? group.name : "Unknown Group";
            }
          },
          { 
            key: "scanned_at", 
            label: "Time",
            render: (value: any) => {
              const date = new Date(value);
              return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            }
          },
          { 
            key: "status", 
            label: "Status",
            render: (value: any) => (
              <div className="flex items-center gap-2">
                {getStatusIcon(value)}
                <span className={value === "present" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {value === "present" ? "Present" : "Absent"}
                </span>
              </div>
            )
          },
          { 
            key: "location_verified", 
            label: "Location",
            render: (value: any, item: any) => getLocationStatus(item)
          }
        ]}
      />

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">Live feed of attendance activities</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredAttendance.slice(0, 10).map((record, index) => (
              <div key={record._id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(record.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {record.status === "present" ? "Member marked present" : "Member marked absent"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.scanned_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {record.location_verified ? "📍 Verified" : "⚠️ Unverified"}
                </div>
              </div>
            ))}
            {filteredAttendance.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p>No attendance records yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
