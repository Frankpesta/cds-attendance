"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateDeviceFingerprint } from "@/lib/utils";
import Link from "next/link";

function LoginForm() {
  const [stateCode, setStateCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err.replace(/\+/g, " ")));
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const next = searchParams.get("next") || "/dashboard";
    const fingerprintInput = document.createElement("input");
    fingerprintInput.type = "hidden";
    fingerprintInput.name = "deviceFingerprint";
    fingerprintInput.value = generateDeviceFingerprint();
    form.appendChild(fingerprintInput);
    const nextInput = document.createElement("input");
    nextInput.type = "hidden";
    nextInput.name = "next";
    nextInput.value = next;
    form.appendChild(nextInput);
    // Form POST triggers full page navigation; browser follows 302, URL updates
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
      <form action="/api/auth/login" method="POST" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">State Code</label>
          <Input
            name="stateCode"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            placeholder="AK/24A/1234"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <Input
            name="password"
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


