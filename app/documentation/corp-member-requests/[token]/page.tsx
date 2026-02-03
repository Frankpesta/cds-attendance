"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDocumentationValidateLink } from "@/hooks/useConvexQueries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { useRouter } from "next/navigation";

const initialForm = {
  ppa_name: "",
  ppa_address: "",
  ppa_phone_number: "",
  number_of_corp_members_requested: "",
  discipline_needed: "",
  gender_needed: "",
  monthly_stipend: "",
  available_accommodation: "no",
};

export default function CorpMemberRequestRegistrationPage({ params }: { params: { token: string } }) {
  const { push } = useToast();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: link } = useDocumentationValidateLink(params.token, "corp_member_request");

  const submitCorpMemberRequest = useMutation(api.documentation.submitCorpMemberRequest);

  const disabled = useMemo(
    () =>
      !form.ppa_name ||
      !form.ppa_address ||
      !form.ppa_phone_number ||
      !form.number_of_corp_members_requested ||
      !form.discipline_needed ||
      !form.gender_needed ||
      !form.monthly_stipend,
    [form],
  );

  const handleSubmit = async () => {
    if (!link || !link.token) return;
    setSubmitting(true);
    try {
      const result = await submitCorpMemberRequest({
        token: link.token,
        payload: {
          ppa_name: form.ppa_name.trim(),
          ppa_address: form.ppa_address.trim(),
          ppa_phone_number: form.ppa_phone_number.trim(),
          number_of_corp_members_requested: parseInt(form.number_of_corp_members_requested) || 0,
          discipline_needed: form.discipline_needed.trim(),
          gender_needed: form.gender_needed,
          monthly_stipend: parseFloat(form.monthly_stipend) || 0,
          available_accommodation: form.available_accommodation === "yes",
        },
      });

      // Trigger Pusher notification
      try {
        await fetch("/api/pusher/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: "admin-notifications",
            event: "corp-member-request",
            data: {
              message: "A new corp member request has been submitted",
              ppa_name: form.ppa_name.trim(),
              number_requested: parseInt(form.number_of_corp_members_requested) || 0,
              timestamp: Date.now(),
            },
          }),
        });
      } catch (notifError) {
        // Don't fail the submission if notification fails
        console.error("Failed to send notification:", notifError);
      }

      push({ variant: "success", title: "Request submitted successfully", description: "Redirecting to success page..." });
      setTimeout(() => {
        router.push(`/documentation/corp-member-requests/${link.token}/success`);
      }, 1000);
    } catch (error: any) {
      push({ variant: "error", title: "Submission failed", description: extractErrorMessage(error, "Failed to submit request") });
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
            <h1 className="text-3xl font-bold tracking-tight">Corp Member Request Form</h1>
            <p className="text-muted-foreground">
              Please fill out this form to request for corp members. All fields marked with * are required.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    PPA Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.ppa_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ppa_name: event.target.value,
                      }))
                    }
                    placeholder="Enter PPA name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    PPA Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={form.ppa_phone_number}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ppa_phone_number: event.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="sm:col-span-1 md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    PPA Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.ppa_address}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ppa_address: event.target.value,
                      }))
                    }
                    placeholder="Enter full PPA address"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Number of Corp Members Requested <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={form.number_of_corp_members_requested}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        number_of_corp_members_requested: event.target.value,
                      }))
                    }
                    placeholder="Enter number"
                    min="1"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Discipline of Corp Members Needed <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.discipline_needed}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        discipline_needed: event.target.value,
                      }))
                    }
                    placeholder="e.g., Medicine, Engineering, etc."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Gender of Corp Members Needed <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.gender_needed}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        gender_needed: event.target.value,
                      }))
                    }
                    options={[
                      { value: "", label: "Select" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Any", label: "Any" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Monthly Stipends Paid <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={form.monthly_stipend}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        monthly_stipend: event.target.value,
                      }))
                    }
                    placeholder="Enter amount in Naira"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Available Accommodation <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.available_accommodation}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        available_accommodation: event.target.value,
                      }))
                    }
                    options={[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                    ]}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-6" disabled={disabled || submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
