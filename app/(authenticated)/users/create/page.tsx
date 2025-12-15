"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createUserAction } from "@/app/actions/users";
import { useFormValidation } from "@/hooks/useFormValidation";
import { validateUserForm } from "@/lib/validation";
import { extractErrorMessage } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CreateUserPage() {
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const { validateForm, getFieldError, clearFieldError, hasErrors } = useFormValidation();
  
  // Fetch CDS groups for the select dropdown
  const cdsGroups = useQuery(api.cds_groups.list, {});

  const [form, setForm] = useState({
    name: "",
    email: "",
    state_code: "",
    role: "",
    password: "",
    confirmPassword: "",
    cds_group_id: "",
  });

  const roleOptions = [
    { value: "", label: "Select a role..." },
    { value: "super_admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "corps_member", label: "Corps Member" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = validateForm(() => validateUserForm(form));
    if (!isValid) {
      push({ variant: "error", title: "Validation Error", description: "Please fix the errors below" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("email", form.email);
      formData.set("state_code", form.state_code);
      formData.set("role", form.role);
      formData.set("password", form.password);
      formData.set("cds_group_id", form.cds_group_id);

      const res = await createUserAction(formData);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "User created", description: "User has been created successfully" });
      window.location.href = "/users";
    } catch (e: any) {
      push({ variant: "error", title: "Failed", description: extractErrorMessage(e, "Failed to create user") });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
          <p className="text-muted-foreground">Add a new user to the system</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <h2 className="text-xl font-semibold">User Details</h2>
          <p className="text-sm text-muted-foreground">Fill in the user information below</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <Input
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    clearFieldError("name");
                  }}
                  className={getFieldError("name") ? "border-red-500" : ""}
                  required
                />
                {getFieldError("name") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("name")}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    clearFieldError("email");
                  }}
                  className={getFieldError("email") ? "border-red-500" : ""}
                  required
                />
                {getFieldError("email") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("email")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">State Code *</label>
                <Input
                  placeholder="e.g., AK/24A/1234"
                  value={form.state_code}
                  onChange={(e) => {
                    setForm({ ...form, state_code: e.target.value });
                    clearFieldError("state_code");
                  }}
                  className={getFieldError("state_code") ? "border-red-500" : ""}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Format: State/Batch/Number</p>
                {getFieldError("state_code") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("state_code")}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <Select
                  value={form.role}
                  onChange={(e) => {
                    setForm({ ...form, role: e.target.value });
                    clearFieldError("role");
                  }}
                  options={roleOptions}
                />
                {getFieldError("role") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("role")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    clearFieldError("password");
                  }}
                  className={getFieldError("password") ? "border-red-500" : ""}
                  required
                />
                {getFieldError("password") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("password")}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password *</label>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm({ ...form, confirmPassword: e.target.value });
                    clearFieldError("confirmPassword");
                  }}
                  className={getFieldError("confirmPassword") ? "border-red-500" : ""}
                  required
                />
                {getFieldError("confirmPassword") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("confirmPassword")}</span>
                  </div>
                )}
              </div>
            </div>

            {form.role === "corps_member" && (
              <div>
                <label className="block text-sm font-medium mb-2">CDS Group</label>
                <Select
                  value={form.cds_group_id}
                  onChange={(e) => {
                    setForm({ ...form, cds_group_id: e.target.value });
                    clearFieldError("cds_group_id");
                  }}
                  options={cdsGroups?.map((group: { _id: string; name: string }) => ({ value: group._id, label: group.name })) || []}
                />
                {getFieldError("cds_group_id") && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getFieldError("cds_group_id")}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Create User
              </Button>
              <Link href="/users">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

