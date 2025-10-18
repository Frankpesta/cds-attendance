"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { createAdminAssignmentAction, removeAdminAssignmentAction } from "@/app/actions/admin_assignments";
import { Users, Building2, Plus, Trash2, UserCheck } from "lucide-react";

export default function AdminAssignmentsPage() {
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  // Fetch data
  const admins = useQuery(api.users.list, {});
  const groups = useQuery(api.cds_groups.list, {});
  const assignments = useQuery(api.admin_assignments.list, {});

  const adminOptions = admins?.filter(user => user.role === "admin").map(admin => ({
    value: admin._id,
    label: `${admin.name} (${admin.email})`
  })) || [];

  const groupOptions = groups?.map(group => ({
    value: group._id,
    label: group.name
  })) || [];

  const handleAssign = async () => {
    if (!selectedAdmin || !selectedGroup) {
      push({ variant: "error", title: "Validation Error", description: "Please select both admin and group" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("admin_id", selectedAdmin);
      formData.set("cds_group_id", selectedGroup);

      const res = await createAdminAssignmentAction(formData);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "Assignment Created", description: "Admin has been assigned to the group" });
      setSelectedAdmin("");
      setSelectedGroup("");
    } catch (e: unknown) {
      push({ variant: "error", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    setLoading(true);
    try {
      const res = await removeAdminAssignmentAction(assignmentId);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "Assignment Removed", description: "Admin assignment has been removed" });
    } catch (e: unknown) {
      push({ variant: "error", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Group Assignments</h1>
        <p className="text-muted-foreground">Assign admins to manage specific CDS groups</p>
      </div>

      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Assign Admin to Group</h2>
          <p className="text-sm text-muted-foreground">Select an admin and assign them to a CDS group</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Admin</label>
              <Select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                options={[{ value: "", label: "Choose an admin..." }, ...adminOptions]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select CDS Group</label>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={[{ value: "", label: "Choose a group..." }, ...groupOptions]}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAssign} 
                loading={loading}
                disabled={!selectedAdmin || !selectedGroup}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <DataTable
        title="Current Assignments"
        description={`${assignments?.length || 0} admin assignments`}
        data={assignments || []}
        columns={[
          { 
            key: "admin_name", 
            label: "Admin",
            render: (value, item) => {
              const admin = admins?.find(a => a._id === item.admin_id);
              return admin ? `${admin.name} (${admin.email})` : "Unknown Admin";
            }
          },
          { 
            key: "group_name", 
            label: "CDS Group",
            render: (value, item) => {
              const group = groups?.find(g => g._id === item.cds_group_id);
              return group ? group.name : "Unknown Group";
            }
          },
          { 
            key: "created_at", 
            label: "Assigned Date",
            render: (value) => new Date(value).toLocaleDateString()
          },
          {
            key: "actions",
            label: "Actions",
            render: (_, item) => (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleRemove(item._id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )
          }
        ]}
      />

      {/* Admin Group Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Admins</h3>
            </div>
            <p className="text-sm text-muted-foreground">Available administrators</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminOptions.map(admin => (
                <div key={admin.value} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{admin.label}</span>
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
              ))}
              {adminOptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No admins available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <h3 className="text-lg font-semibold">CDS Groups</h3>
            </div>
            <p className="text-sm text-muted-foreground">Available groups for assignment</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupOptions.map(group => (
                <div key={group.value} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{group.label}</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
              ))}
              {groupOptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No groups available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

