"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateUserAction, changeUserPasswordAction } from "@/app/actions/users";
import { ArrowLeft, Save, Key } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function EditUserPage() {
  const params = useParams();
  const userId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { push } = useToast();
  
  // Fetch user data and CDS groups
  const user = useQuery(api.users.get, { id: userId as any });
  const cdsGroups = useQuery(api.cds_groups.list, {});

  const [form, setForm] = useState({
    name: "",
    email: "",
    state_code: "",
    role: "",
    address: "",
    ppa: "",
    cds_group_id: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        state_code: user.state_code || "",
        role: user.role || "",
        address: user.address || "",
        ppa: user.ppa || "",
        cds_group_id: user.cds_group_id || "",
      });
    }
  }, [user]);

  const roleOptions = [
    { value: "", label: "Select a role..." },
    { value: "super_admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "corps_member", label: "Corps Member" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.state_code || !form.role) {
      push({ variant: "error", title: "Validation Error", description: "Please fill in all required fields" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("email", form.email);
      formData.set("state_code", form.state_code);
      formData.set("role", form.role);
      formData.set("address", form.address);
      formData.set("ppa", form.ppa);
      formData.set("cds_group_id", form.cds_group_id);

      const res = await updateUserAction(userId, formData);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "User updated", description: "User has been updated successfully" });
    } catch (e: any) {
      push({ variant: "error", title: "Failed", description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      push({ variant: "error", title: "Validation Error", description: "Passwords do not match" });
      return;
    }

    if (!passwordForm.newPassword) {
      push({ variant: "error", title: "Validation Error", description: "Please enter a new password" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changeUserPasswordAction(userId, passwordForm.newPassword);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "Password changed", description: "Password has been changed successfully" });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      push({ variant: "error", title: "Failed", description: e?.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">Update user information</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Details Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">User Details</h2>
            <p className="text-sm text-muted-foreground">Update user information</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">State Code *</label>
                  <Input
                    placeholder="e.g., AK/24A/1234"
                    value={form.state_code}
                    onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role *</label>
                  <Select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    options={roleOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    placeholder="Enter residential address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PPA</label>
                  <Input
                    placeholder="Enter PPA"
                    value={form.ppa}
                    onChange={(e) => setForm({ ...form, ppa: e.target.value })}
                  />
                </div>
              </div>

              {form.role === "corps_member" && (
                <div>
                  <label className="block text-sm font-medium mb-2">CDS Group</label>
                  <Select
                    value={form.cds_group_id}
                    onChange={(e) => setForm({ ...form, cds_group_id: e.target.value })}
                    options={cdsGroups?.map((group: { _id: string; name: string }) => ({ value: group._id, label: group.name })) || []}
                  />
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Update User
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Change Password</h2>
            <p className="text-sm text-muted-foreground">Update user password</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Password *</label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password *</label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" loading={passwordLoading} className="w-full">
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

