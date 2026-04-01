"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateDeviceFingerprint } from "@/lib/utils";
import { loginAction } from "@/app/actions/auth";
import Link from "next/link";

function LoginForm() {
  const [stateCode, setStateCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Legacy /api/auth/login URLs used ?error= — show message and clean the address bar
  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    setError(decodeURIComponent(err.replace(/\+/g, " ")));
    const next = searchParams.get("next");
    const qs = new URLSearchParams();
    if (next) qs.set("next", next);
    const href = qs.toString() ? `/login?${qs}` : "/login";
    router.replace(href, { scroll: false });
  }, [searchParams, router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const next = (searchParams.get("next") || "/dashboard").trim() || "/dashboard";
      const nextPath = next === "/" ? "/dashboard" : next;
      const fd = new FormData();
      fd.set("stateCode", stateCode);
      fd.set("password", password);
      fd.set("deviceFingerprint", generateDeviceFingerprint());
      fd.set("next", nextPath);
      const result = await loginAction(fd);
      if (result.ok) {
        // Full navigation so middleware reliably sees the new cookie (better on mobile than client routing alone)
        window.location.assign(result.redirect);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
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


