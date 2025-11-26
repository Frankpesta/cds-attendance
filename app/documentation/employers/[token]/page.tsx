"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const initialForm = {
  organization_name: "",
  organization_address: "",
  organization_phone: "",
  contact_person_name: "",
  contact_person_phone: "",
  cms_required_per_year: "",
  accommodation: "",
  monthly_stipend: "",
  email: "",
  nearest_landmark: "",
};

export default function EmployerRegistrationPage({ params }: { params: { token: string } }) {
  const { push } = useToast();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const link = useQuery(api.documentation.validateLink, {
    token: params.token,
    type: "employer",
  });
  const submitEmployer = useMutation(api.documentation.submitEmployer);

  const disabled =
    !form.organization_name ||
    !form.organization_address ||
    !form.organization_phone ||
    !form.contact_person_name ||
    !form.contact_person_phone ||
    !form.cms_required_per_year ||
    !form.accommodation ||
    !form.monthly_stipend ||
    !form.email ||
    !form.nearest_landmark;

  const handleSubmit = async () => {
    if (!link || !link.token) return;
    setSubmitting(true);
    try {
      await submitEmployer({
        token: link.token,
        payload: {
          organization_name: form.organization_name,
          organization_address: form.organization_address,
          organization_phone: form.organization_phone,
          contact_person_name: form.contact_person_name,
          contact_person_phone: form.contact_person_phone,
          cms_required_per_year: Number(form.cms_required_per_year),
          accommodation: form.accommodation === "yes",
          monthly_stipend: Number(form.monthly_stipend),
          email: form.email,
          nearest_landmark: form.nearest_landmark,
        },
      });
      setSubmitted(true);
      push({ variant: "success", title: "Submission received" });
    } catch (error: any) {
      push({ variant: "error", title: "Submission failed", description: error?.message });
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-lg text-center">
          <CardHeader>
            <h1 className="text-2xl font-semibold">Link inactive</h1>
            <p className="text-sm text-muted-foreground">
              The employer documentation link you used is no longer active. Please contact the CDS office for assistance.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-xl text-center">
          <CardHeader>
            <h1 className="text-3xl font-bold">Thank you!</h1>
            <p className="text-muted-foreground">Your organization details have been submitted successfully.</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSubmitted(false)}>Submit another response</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-bold tracking-tight">Employer Documentation</h1>
            <p className="text-muted-foreground">
              Provide accurate details about your organization. This information helps us match you with qualified corps members.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(form).map(([key, value]) => {
                if (key === "accommodation") {
                  return (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-medium">Accommodation for CMS?</label>
                      <Select
                        value={value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            accommodation: event.target.value,
                          }))
                        }
                        options={[
                          { value: "", label: "Select" },
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                    </div>
                  );
                }
                if (key === "cms_required_per_year" || key === "monthly_stipend") {
                  return (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-medium">
                        {key === "cms_required_per_year" ? "Number of CMS needed per year" : "Monthly Stipend (₦)"}
                      </label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  );
                }
                return (
                  <div key={key}>
                    <label className="mb-2 block text-sm font-medium">
                      {key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                    <Input
                      value={value}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            <Button className="w-full" disabled={disabled || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit Documentation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
