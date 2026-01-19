"use client";
import { useState } from "react";
import { loginAction } from "../actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage, generateDeviceFingerprint } from "@/lib/utils";
import Link from "next/link";

export default function LoginPage() {
  const [stateCode, setStateCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const fd = new FormData();
      fd.set("stateCode", stateCode);
      fd.set("password", password);
      fd.set("deviceFingerprint", deviceFingerprint);
      const res = await loginAction(fd);
      if (!res.ok) {
        setError(res.error || "Login failed");
        push({ variant: "error", title: "Login failed", description: res.error || "Invalid credentials" });
        return;
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err, "Login failed");
      setError(errorMsg);
      push({ variant: "error", title: "Login failed", description: errorMsg });
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
        <div className="rounded-lg border bg-white shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">State Code</label>
          <Input
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            placeholder="AK/24A/1234"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" loading={loading}>
          Sign In
        </Button>
        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[#008751] hover:underline font-medium">
              Sign up
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/forgot-password" className="text-[#008751] hover:underline font-medium">
              Forgot your password?
            </Link>
          </p>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}


