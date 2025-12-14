"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordResetAction } from "../actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stateCode, setStateCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordResetAction(stateCode, email);
      if (!res.ok) {
        push({ variant: "error", title: "Error", description: res.error || "Invalid state code or email combination" });
        return;
      }
      if (res.token) {
        push({ variant: "success", title: "Verification successful", description: "Redirecting to password reset..." });
        router.push(`/reset-password?token=${res.token}`);
      } else {
        push({ variant: "error", title: "Error", description: "Failed to generate reset token" });
      }
    } catch (err: any) {
      push({ variant: "error", title: "Error", description: err?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-[#008751]">NYSC CDS Attendance</div>
          <div className="text-sm text-gray-600 mt-1">Akure South LGA</div>
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your state code and email address to verify your identity and reset your password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">State Code</label>
                <Input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                  placeholder="AK/24A/1234"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Verify and Reset Password
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
