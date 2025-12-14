"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordAction, validateResetTokenAction } from "../actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setValidating(false);
        setValid(false);
        return;
      }
      try {
        const result = await validateResetTokenAction(token);
        setValid(result.valid);
      } catch (err) {
        setValid(false);
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      push({ variant: "error", title: "Error", description: "Passwords do not match" });
      return;
    }
    if (!token) {
      push({ variant: "error", title: "Error", description: "Invalid reset token" });
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordAction(token, password);
      if (!res.ok) {
        push({ variant: "error", title: "Error", description: res.error || "Failed to reset password" });
        return;
      }
      setSuccess(true);
      push({ variant: "success", title: "Success", description: "Password reset successfully" });
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      push({ variant: "error", title: "Error", description: err?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!valid || !token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-semibold">Invalid or Expired Link</h1>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-semibold">Password Reset Successful</h1>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-[#008751]">NYSC CDS Attendance</div>
          <div className="text-sm text-gray-600 mt-1">Akure South LGA</div>
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">Set New Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">New Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Reset Password
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-[#008751] hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
