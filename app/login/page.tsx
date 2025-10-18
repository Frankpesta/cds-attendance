"use client";
import { useState } from "react";
import { loginAction } from "../actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { seedSuperAdminAction } from "../actions/seed";

export default function LoginPage() {
  const [stateCode, setStateCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const [showSeed, setShowSeed] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seed, setSeed] = useState({ secret: "", name: "", email: "", password: "", stateCode: "AK/24A/0001" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("stateCode", stateCode);
      fd.set("password", password);
      const res = await loginAction(fd);
      if (!res.ok) {
        setError(res.error || "Login failed");
        push({ variant: "error", title: "Login failed", description: res.error || "Invalid credentials" });
        return;
      }
      if (res.mustChange) {
        window.location.href = "/password-change";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
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
      </form>
          <div className="mt-6 pt-4 border-t">
            <button className="text-xs text-gray-500 underline" onClick={() => setShowSeed((s) => !s)}>
              {showSeed ? "Hide" : "Seed Super Admin"}
            </button>
            {showSeed && (
              <form
                className="mt-3 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSeedLoading(true);
                  const fd = new FormData();
                  fd.set("secret", seed.secret);
                  fd.set("name", seed.name);
                  fd.set("email", seed.email);
                  fd.set("password", seed.password);
                  fd.set("stateCode", seed.stateCode);
                  const res = await seedSuperAdminAction(fd);
                  setSeedLoading(false);
                  if (!res.ok) {
                    push({ variant: "error", title: "Seed failed", description: res.error });
                  } else {
                    push({ variant: "success", title: "Super admin created" });
                  }
                }}
              >
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input placeholder="SESSION_SECRET" value={seed.secret} onChange={(e) => setSeed({ ...seed, secret: e.target.value })} />
                  <Input placeholder="Name" value={seed.name} onChange={(e) => setSeed({ ...seed, name: e.target.value })} />
                  <Input placeholder="Email" value={seed.email} onChange={(e) => setSeed({ ...seed, email: e.target.value })} />
                  <Input placeholder="Password" type="password" value={seed.password} onChange={(e) => setSeed({ ...seed, password: e.target.value })} />
                  <Input placeholder="State Code" value={seed.stateCode} onChange={(e) => setSeed({ ...seed, stateCode: e.target.value })} />
                </div>
                <Button type="submit" loading={seedLoading} variant="secondary" className="mt-2">Seed Super Admin</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


