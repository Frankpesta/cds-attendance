"use client";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStats, useUsersList } from "@/hooks/useApiQueries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Unlock, AlertCircle, CheckCircle } from "lucide-react";
import { deleteUserAction, unblockUserAction, batchDeleteUsersAction } from "@/app/actions/users";
import { markAttendanceManuallyAction } from "@/app/actions/attendance";
import { extractErrorMessage } from "@/lib/utils";
import { getSessionAction } from "@/app/actions/session";
import Link from "next/link";

function extractBatchFromStateCode(stateCode: string): string {
  const parts = String(stateCode || "").split("/");
  return parts.length >= 2 ? parts[1] : "";
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { push } = useToast();

  // Get current user's role
  useEffect(() => {
    (async () => {
      const session = await getSessionAction();
      if (session) {
        setCurrentUserRole(session.user.role);
      }
    })();
  }, []);

  const queryClient = useQueryClient();
  useDashboardStats(); // Keep for cache warming
  const { data: allUsers } = useUsersList();

  const invalidateAfterManualMark = () => {
    queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
  };

  const getManualAttendanceErrorMessage = (error: unknown) => {
    const message = extractErrorMessage(error, "Manual attendance marking failed.");
    if (message.includes("already marked")) {
      return "Attendance already exists for this member today.";
    }
    if (message.includes("CDS group")) {
      return "This member has no valid CDS group assignment. Update the profile and try again.";
    }
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return "You do not have permission to perform manual attendance marking.";
    }
    return `Reason: ${message}`;
  };

  const filteredUsers = allUsers?.filter((user: any) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.state_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const isBlocked = user.is_blocked === true || user.is_blocked === "true";
    const matchesStatus = !statusFilter ||
      (statusFilter === "blocked" && isBlocked) ||
      (statusFilter === "active" && !isBlocked);
    const userBatch = extractBatchFromStateCode(user.state_code || "");
    const matchesBatch = !batchFilter || userBatch === batchFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesBatch;
  }) || [];

  const batchOptions = useMemo(() => {
    const batches = new Set<string>();
    allUsers?.forEach((u: any) => {
      const b = extractBatchFromStateCode(u.state_code || "");
      if (b) batches.add(b);
    });
    return [
      { value: "", label: "All Batches" },
      ...Array.from(batches).sort().map((b) => ({ value: b, label: b })),
    ];
  }, [allUsers]);

  const blockedUsersCount = allUsers?.filter((user: any) => {
    const isBlocked = user.is_blocked === true || user.is_blocked === "true";
    return isBlocked;
  }).length || 0;

  const roleOptions = [
    { value: "", label: "All Roles" },
    { value: "super_admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "corps_member", label: "Corps Member" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Link href="/users/create">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      {/* Blocked Users Alert */}
      {blockedUsersCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">
                    {blockedUsersCount} user{blockedUsersCount !== 1 ? 's' : ''} {blockedUsersCount !== 1 ? 'are' : 'is'} currently blocked
                  </p>
                  <p className="text-sm text-red-700">
                    Blocked users cannot login. Use the unblock button to restore access.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setStatusFilter("blocked")}
              >
                View Blocked Users
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Filters</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or state code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={roleOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "blocked", label: "Blocked" },
                ]}
              />
            </div>
            {currentUserRole === "super_admin" && (
              <div>
                <label className="block text-sm font-medium mb-2">Batch</label>
                <Select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  options={batchOptions}
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("");
                  setStatusFilter("");
                  setBatchFilter("");
                  setSelectedIds([]);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <DataTable
        title="Users"
        description={`${filteredUsers.length} users found${selectedIds.length > 0 ? ` • ${selectedIds.length} selected` : ""}`}
        data={filteredUsers}
        selectable={currentUserRole === "super_admin"}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        toolbar={
          currentUserRole === "super_admin" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(filteredUsers.map((u: any) => u._id))}
              >
                Select all filtered
              </Button>
              {selectedIds.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                    Clear selection
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setBatchDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete selected ({selectedIds.length})
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "state_code", label: "State Code" },
          { 
            key: "role", 
            label: "Role",
            render: (value: any) => (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                value === "super_admin" ? "bg-purple-100 text-purple-800" :
                value === "admin" ? "bg-blue-100 text-blue-800" :
                "bg-green-100 text-green-800"
              }`}>
                {value.replace('_', ' ').toUpperCase()}
              </span>
            )
          },
          { 
            key: "created_at", 
            label: "Created",
            render: (value: any) => new Date(value).toLocaleDateString()
          },
          { 
            key: "is_blocked", 
            label: "Status",
            render: (value: any, user: any) => {
              const isBlocked = value === true || value === "true" || user.is_blocked === true || user.is_blocked === "true";
              return isBlocked ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Blocked
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              );
            }
          },
          {
            key: "actions",
            label: "Actions",
            render: (_: any, user: any) => (
              <div className="flex gap-2">
                <Link href={`/users/${user._id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                {currentUserRole === "super_admin" && user.role === "corps_member" && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    disabled={markingAttendance === user._id}
                    onClick={async () => {
                      if (!confirm(`Mark attendance for ${user.name} today?`)) {
                        return;
                      }
                      setMarkingAttendance(user._id);
                      try {
                        const res = await markAttendanceManuallyAction(user._id);
                        if (!res.ok) {
                          push({
                            variant: "error",
                            title: `Manual mark failed for ${user.name}`,
                            description: getManualAttendanceErrorMessage(res.error || "Manual attendance marking failed."),
                          });
                          return;
                        }
                        push({ variant: "success", title: "Attendance marked", description: `Attendance has been marked for ${user.name}` });
                        invalidateAfterManualMark();
                      } catch (err: any) {
                        push({
                          variant: "error",
                          title: `Manual mark failed for ${user.name}`,
                          description: getManualAttendanceErrorMessage(err),
                        });
                      } finally {
                        setMarkingAttendance(null);
                      }
                    }}
                    title="Mark attendance for this corps member"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                {(user.is_blocked === true || user.is_blocked === "true") && (
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={unblocking === user._id}
                    onClick={async () => {
                      if (!confirm(`Unblock ${user.name}? This will allow them to login from any device.`)) {
                        return;
                      }
                      setUnblocking(user._id);
                      try {
                        const res = await unblockUserAction(user._id, true);
                        if (!res.ok) {
                          push({ variant: "error", title: "Unblock failed", description: res.error || "Failed to unblock user" });
                          return;
                        }
                        push({ variant: "success", title: "User unblocked", description: `${user.name} has been unblocked and can now login from any device` });
                        // The query will automatically refresh
                      } catch (err: any) {
                        push({ variant: "error", title: "Unblock failed", description: extractErrorMessage(err, "Failed to unblock user") });
                      } finally {
                        setUnblocking(null);
                      }
                    }}
                  >
                    <Unlock className="w-4 h-4 mr-1" />
                    {unblocking === user._id ? "Unblocking..." : "Unblock"}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={deleting === user._id}
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                      return;
                    }
                    setDeleting(user._id);
                    try {
                      const res = await deleteUserAction(user._id);
                      if (!res.ok) {
                        push({ variant: "error", title: "Delete failed", description: res.error || "Failed to delete user" });
                        return;
                      }
                      push({ variant: "success", title: "User deleted", description: `${user.name} has been deleted successfully` });
                      // The query will automatically refresh
                    } catch (err: any) {
                      push({ variant: "error", title: "Delete failed", description: extractErrorMessage(err, "Failed to delete user") });
                    } finally {
                      setDeleting(null);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      {/* Batch Delete Confirmation Dialog */}
      {batchDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="mx-4 max-w-md w-full">
            <CardHeader>
              <h3 className="text-lg font-semibold">Confirm Batch Delete</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete {selectedIds.length} user(s)? This will permanently remove all users and their associated data (sessions, attendance, admin assignments, audit logs, clearance verifications). This action cannot be undone.
              </p>
            </CardHeader>
            <CardContent className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setBatchDeleteDialogOpen(false)}
                disabled={batchDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                disabled={batchDeleting}
                onClick={async () => {
                  setBatchDeleting(true);
                  try {
                    const res = await batchDeleteUsersAction(selectedIds);
                    if (!res.ok) {
                      push({ variant: "error", title: "Batch delete failed", description: res.error || "Failed to delete users" });
                      return;
                    }
                    const { deleted, errors } = res.data!;
                    if (errors.length > 0) {
                      push({
                        variant: "error",
                        title: `Deleted ${deleted}, ${errors.length} failed`,
                        description: errors.slice(0, 3).join("; "),
                      });
                    } else {
                      push({ variant: "success", title: "Users deleted", description: `${deleted} user(s) and their data have been permanently deleted.` });
                    }
                    setSelectedIds([]);
                    setBatchDeleteDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["users"] });
                    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
                  } catch (err: any) {
                    push({ variant: "error", title: "Batch delete failed", description: extractErrorMessage(err, "Failed to delete users") });
                  } finally {
                    setBatchDeleting(false);
                  }
                }}
              >
                {batchDeleting ? "Deleting..." : "Yes, delete all"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

