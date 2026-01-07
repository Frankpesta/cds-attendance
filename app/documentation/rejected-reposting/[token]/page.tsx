"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { useRouter } from "next/navigation";

const initialForm = {
  name: "",
  state_code: "",
  sex: "",
  discipline: "",
  previous_ppa: "",
  new_ppa: "",
  recommendation: "",
};

export default function RejectedRepostingRegistrationPage({ params }: { params: { token: string } }) {
  const { push } = useToast();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const link = useQuery(api.documentation.validateLink, {
    token: params.token,
    type: "rejected_reposting",
  });

  const submitRejectedReposting = useMutation(api.documentation.submitRejectedReposting);

  const disabled = useMemo(
    () =>
      !form.name ||
      !form.state_code ||
      !form.sex ||
      !form.discipline ||
      !form.previous_ppa,
    [form],
  );

  const handleSubmit = async () => {
    if (!link || !link.token) return;
    setSubmitting(true);
    try {
      await submitRejectedReposting({
        token: link.token,
        payload: {
          name: form.name.trim(),
          state_code: form.state_code.trim().toUpperCase(),
          sex: form.sex,
          discipline: form.discipline.trim(),
          previous_ppa: form.previous_ppa.trim().toUpperCase(),
          new_ppa: form.new_ppa?.trim() || undefined,
          recommendation: form.recommendation?.trim() || undefined,
        },
      });
      push({ variant: "success", title: "Form submitted successfully", description: "Redirecting to success page..." });
      setTimeout(() => {
        router.push(`/documentation/rejected-reposting/${link.token}/success`);
      }, 1000);
    } catch (error: any) {
      push({ variant: "error", title: "Submission failed", description: extractErrorMessage(error, "Failed to submit form") });
    } finally {
      setSubmitting(false);
    }
  };

  if (link === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <h1 className="text-2xl font-semibold">Link invalid</h1>
            <p className="text-sm text-muted-foreground">This registration link is inactive. Contact the CDS admin for a new link.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-bold tracking-tight">Rejected/Reposting Corp Members Form</h1>
            <p className="text-muted-foreground">
              Please fill out this form with accurate details. All fields marked with * are required.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  State Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.state_code}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      state_code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter state code"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sex <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form.sex}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sex: event.target.value,
                    }))
                  }
                  options={[
                    { value: "", label: "Select" },
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Discipline <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.discipline}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discipline: event.target.value,
                    }))
                  }
                  placeholder="Enter discipline"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Previous PPA <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.previous_ppa}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      previous_ppa: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter previous PPA"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  New PPA <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Input
                  value={form.new_ppa}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      new_ppa: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter new PPA (if applicable)"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="sm:col-span-1 md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Recommendation <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Input
                  value={form.recommendation}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      recommendation: event.target.value,
                    }))
                  }
                  placeholder="Enter recommendation (if any)"
                />
              </div>
            </div>

            <Button className="w-full" disabled={disabled || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit Form"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

