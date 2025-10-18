"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Users, Plus, Edit, Trash2, Search } from "lucide-react";
import Link from "next/link";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { push } = useToast();

  // Fetch users data
  const users = useQuery(api.dashboard.getStats, {});
  const allUsers = useQuery(api.users.list, {});

  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.state_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

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

      {/* Filters */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Filters</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("");
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
        description={`${filteredUsers.length} users found`}
        data={filteredUsers}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "state_code", label: "State Code" },
          { 
            key: "role", 
            label: "Role",
            render: (value) => (
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
            render: (value) => new Date(value).toLocaleDateString()
          },
          {
            key: "actions",
            label: "Actions",
            render: (_, user) => (
              <div className="flex gap-2">
                <Link href={`/users/${user._id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                      // TODO: Implement delete
                      push({ variant: "error", title: "Not implemented", description: "Delete functionality coming soon" });
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
    </div>
  );
}

