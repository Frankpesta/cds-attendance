"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Filter } from "lucide-react";
import { getSessionAction } from "@/app/actions/session";

export default function AttendanceHistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  // Get current user's attendance history
  const attendanceHistory = useQuery(
    api.attendance.getUserHistory, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );
  const cdsGroups = useQuery(api.cds_groups.list, {});

  // Generate month options for current year
  const currentYear = new Date().getFullYear();
  const monthOptions = [
    { value: "", label: "All months" },
    { value: `${currentYear}-01`, label: `January ${currentYear}` },
    { value: `${currentYear}-02`, label: `February ${currentYear}` },
    { value: `${currentYear}-03`, label: `March ${currentYear}` },
    { value: `${currentYear}-04`, label: `April ${currentYear}` },
    { value: `${currentYear}-05`, label: `May ${currentYear}` },
    { value: `${currentYear}-06`, label: `June ${currentYear}` },
    { value: `${currentYear}-07`, label: `July ${currentYear}` },
    { value: `${currentYear}-08`, label: `August ${currentYear}` },
    { value: `${currentYear}-09`, label: `September ${currentYear}` },
    { value: `${currentYear}-10`, label: `October ${currentYear}` },
    { value: `${currentYear}-11`, label: `November ${currentYear}` },
    { value: `${currentYear}-12`, label: `December ${currentYear}` },
  ];

  const groupOptions = cdsGroups?.map((group: { _id: string; name: string }) => ({
    value: group._id,
    label: group.name
  })) || [];

  // Filter attendance data
  const filteredAttendance = attendanceHistory?.filter((record: any) => {
    const recordDate = new Date(record.timestamp);
    const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
    
    const monthMatch = !selectedMonth || recordMonth === selectedMonth;
    const groupMatch = !selectedGroup || record.cds_group_id === selectedGroup;
    
    return monthMatch && groupMatch;
  }) || [];

  // Calculate statistics
  const totalAttendance = filteredAttendance.length;
  const presentCount = filteredAttendance.filter((record: any) => record.status === "present").length;
  const absentCount = filteredAttendance.filter((record: any) => record.status === "absent").length;
  const attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Attendance History</h1>
        <p className="text-muted-foreground">View your attendance records and statistics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalAttendance}</p>
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
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">{attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Filters</h2>
          </div>
          <p className="text-sm text-muted-foreground">Filter your attendance records</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Month</label>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={monthOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Filter by CDS Group</label>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={[{ value: "", label: "All groups" }, ...groupOptions]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <DataTable
        title="Attendance Records"
        description={`${filteredAttendance.length} records found`}
        data={filteredAttendance}
        columns={[
          { 
            key: "date", 
            label: "Date",
            render: (value: any, item: any) => {
              const date = new Date(item.timestamp);
              return date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
          },
          { 
            key: "time", 
            label: "Time",
            render: (value: any, item: any) => {
              const date = new Date(item.timestamp);
              return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          },
          { 
            key: "cds_group_name", 
            label: "CDS Group",
            render: (value: any, item: any) => {
              const group = cdsGroups?.find((g: { _id: string; name: string }) => g._id === item.cds_group_id);
              return group ? group.name : "Unknown Group";
            }
          },
          { 
            key: "status", 
            label: "Status",
            render: (value: any) => (
              <div className="flex items-center gap-2">
                {value === "present" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Present</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">Absent</span>
                  </>
                )}
              </div>
            )
          },
          { 
            key: "location", 
            label: "Location",
            render: (value, item) => (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>
                  Location tracking disabled
                </span>
              </div>
            )
          }
        ]}
      />

      {filteredAttendance.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Attendance Records</h3>
            <p className="text-muted-foreground">
              {selectedMonth || selectedGroup ? 
                "No records found for the selected filters." : 
                "You haven't marked any attendance yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
