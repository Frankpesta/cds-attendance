"use client";
import { useState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { extractErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function PasswordChangePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const { push } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      const fd = new FormData();
      fd.set("currentPassword", currentPassword);
      fd.set("newPassword", newPassword);
      fd.set("confirm", confirm);
      const res = await changePasswordAction(fd);
      if (!res.ok) {
        setError(res.error || "Failed to change password");
        push({ variant: "error", title: "Update failed", description: res.error });
        return;
      }
      setOk(true);
      push({ variant: "success", title: "Password updated" });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Change Password</h1>
        <p className="text-muted-foreground">Update your account password</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Current Password</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">New Password</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm New Password</label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit">Update Password</Button>
        </form>
    </div>
  );
}


