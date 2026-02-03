"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupAction } from "../actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCdsGroupsList } from "@/hooks/useConvexQueries";
import { validateEmail, validatePassword, validateStateCode, validateName } from "@/lib/validation";
import { extractErrorMessage } from "@/lib/utils";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cdsGroupId, setCdsGroupId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const { data: cdsGroups } = useCdsGroupsList();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message || "Invalid name";
    }

    // Email validation
    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // State code validation
    const stateCodeValidation = validateStateCode(stateCode);
    if (!stateCodeValidation.isValid) {
      newErrors.state_code = stateCodeValidation.message || "Invalid state code format";
    }

    // CDS group validation
    if (!cdsGroupId) {
      newErrors.cds_group_id = "Please select a CDS group";
    }

    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message || "Invalid password";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      push({ variant: "error", title: "Validation Error", description: "Please fix the errors below" });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("email", email);
      fd.set("state_code", stateCode);
      fd.set("cds_group_id", cdsGroupId);
      fd.set("password", password);
      fd.set("confirmPassword", confirmPassword);

      const res = await signupAction(fd);
      if (!res.ok) {
        push({ variant: "error", title: "Signup failed", description: res.error || "Failed to create account" });
        return;
      }

      push({ variant: "success", title: "Account created", description: "Your account has been created successfully" });
      router.push("/dashboard");
    } catch (err: any) {
      push({ variant: "error", title: "Signup failed", description: extractErrorMessage(err, "Failed to create account") });
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
          <h1 className="text-xl font-semibold mb-4">Create Account</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                placeholder="Enter your full name"
                required
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                placeholder="Enter your email"
                required
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">State Code</label>
              <Input
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value.toUpperCase());
                  if (errors.state_code) setErrors({ ...errors, state_code: "" });
                }}
                placeholder="OD/25A/2412"
                required
              />
              {errors.state_code && <p className="text-red-600 text-xs mt-1">{errors.state_code}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">CDS Group</label>
              <Select
                value={cdsGroupId}
                onChange={(e) => {
                  setCdsGroupId(e.target.value);
                  if (errors.cds_group_id) setErrors({ ...errors, cds_group_id: "" });
                }}
                options={[
                  { value: "", label: "Select a CDS group..." },
                  ...(cdsGroups?.map((group) => ({ value: group._id, label: group.name })) || []),
                ]}
                required
              />
              {errors.cds_group_id && <p className="text-red-600 text-xs mt-1">{errors.cds_group_id}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                placeholder="Enter password"
                required
              />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                }}
                placeholder="Confirm password"
                required
              />
              {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign Up
            </Button>
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-[#008751] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

