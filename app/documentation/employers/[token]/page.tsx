"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";

const initialForm = {
  organization_name: "",
  organization_address: "",
  organization_phone: "",
  contact_person_name: "",
  contact_person_phone: "",
  cms_required_per_year: "",
  accommodation: "",
  accommodation_type: "",
  monthly_stipend: "",
  email: "",
  nearest_landmark: "",
};

export default function EmployerRegistrationPage({ params }: { params: { token: string } }) {
  const { push } = useToast();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
    (form.accommodation === "yes" && !form.accommodation_type) ||
    !form.monthly_stipend ||
    !form.email ||
    !form.nearest_landmark ||
    !acceptedTerms;

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
          accommodation_type: form.accommodation === "yes" ? form.accommodation_type : undefined,
          monthly_stipend: Number(form.monthly_stipend),
          email: form.email,
          nearest_landmark: form.nearest_landmark,
        },
      });
      setSubmitted(true);
      push({ variant: "success", title: "Submission received" });
    } catch (error: any) {
      push({ variant: "error", title: "Submission failed", description: extractErrorMessage(error, "Failed to submit documentation") });
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
                            // Reset accommodation_type if accommodation is set to "no"
                            accommodation_type: event.target.value === "no" ? "" : prev.accommodation_type,
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
                if (key === "accommodation_type") {
                  // Only show if accommodation is "yes"
                  if (form.accommodation !== "yes") {
                    return null;
                  }
                  return (
                    <div key={key} className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">Type of Accommodation Provided *</label>
                      <Select
                        value={value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            accommodation_type: event.target.value,
                          }))
                        }
                        options={[
                          { value: "", label: "Select accommodation type" },
                          { value: "A single room", label: "A single room" },
                          { value: "A self-contain room", label: "A self-contain room" },
                          { value: "2 or 3 bedroom flat", label: "2 or 3 bedroom flat" },
                        ]}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Please specify the type of accommodation you provide for corps members.
                      </p>
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

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1 text-sm">
                  <span className="font-medium">I acknowledge and accept</span> that I am submitting sensitive organizational information including contact details, financial information, and accommodation details. I understand that this information will be managed in accordance with the Information Management and Security Policy, and I consent to the collection, storage, and processing of this data for the purposes of NYSC CDS documentation and administration.
                </div>
              </label>
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
