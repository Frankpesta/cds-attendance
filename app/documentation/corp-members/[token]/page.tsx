"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Shield } from "lucide-react";

interface MedicalFile {
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  contentType: string;
}

const initialForm = {
  full_name: "",
  state_code: "",
  phone_number: "",
  residential_address: "",
  next_of_kin: "",
  next_of_kin_phone: "",
  gender: "",
  ppa: "",
  course_of_study: "",
  call_up_number: "",
  email: "",
  nysc_account_number: "",
  bank_name: "",
  nin: "",
  cds: "",
  medical_history: "no",
};

export default function CorpMemberRegistrationPage({ params }: { params: { token: string } }) {
  const { push } = useToast();
  const [form, setForm] = useState(initialForm);
  const [medicalFiles, setMedicalFiles] = useState<MedicalFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const link = useQuery(api.documentation.validateLink, {
    token: params.token,
    type: "corp_member",
  });

  const submitCorpMember = useMutation(api.documentation.submitCorpMember);
  const generateUploadUrl = useMutation(api.documentation.generateUploadUrl);

  const disabled = useMemo(
    () =>
      !form.full_name ||
      !form.state_code ||
      !form.phone_number ||
      !form.residential_address ||
      !form.next_of_kin ||
      !form.next_of_kin_phone ||
      !form.gender ||
      !form.ppa ||
      !form.course_of_study ||
      !form.call_up_number ||
      !form.email ||
      !form.nysc_account_number ||
      !form.bank_name ||
      !form.nin ||
      (form.medical_history === "yes" && medicalFiles.length === 0),
    [form, medicalFiles],
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    const next: MedicalFile[] = [...medicalFiles];

    for (const file of files) {
      if (next.length >= 3) {
        push({ variant: "error", title: "Limit reached", description: "Maximum of 3 files allowed." });
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        push({ variant: "error", title: "File too large", description: `${file.name} exceeds 5MB.` });
        continue;
      }
      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        push({ variant: "error", title: "Invalid file", description: `${file.name} must be PDF or image.` });
        continue;
      }
      try {
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await res.json();
        next.push({
          storageId: storageId as Id<"_storage">,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        });
      } catch (error: any) {
        push({ variant: "error", title: "Upload failed", description: error?.message });
      }
    }
    setMedicalFiles(next);
    event.target.value = "";
  };

  const handleSubmit = async () => {
    if (!link || !link.token) return;
    setSubmitting(true);
    try {
      const result = await submitCorpMember({
        token: link.token,
        payload: {
          ...form,
          medical_history: form.medical_history === "yes",
        },
        medical_files: form.medical_history === "yes" ? medicalFiles : [],
      });
      push({ variant: "success", title: "Documentation submitted", description: "Redirecting to SAED selection..." });
      // Redirect to SAED page using the link token
      setTimeout(() => {
        window.location.href = `/documentation/corp-members/${link.token}/saed`;
      }, 1000);
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
            <h1 className="text-3xl font-bold tracking-tight">NYSC Corps Member Documentation</h1>
            <p className="text-muted-foreground">
              Complete this form with accurate details. Ensure contact numbers and financial information are correct for onboarding.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {Object.entries(form).map(([key, value]) => {
                if (key === "medical_history") {
                  return (
                    <div key={key} className="sm:col-span-1 md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">Medical History</label>
                      <Select
                        value={value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            medical_history: event.target.value,
                          }))
                        }
                        options={[
                          { value: "no", label: "No" },
                          { value: "yes", label: "Yes" },
                        ]}
                      />
                    </div>
                  );
                }
                if (key === "gender") {
                  return (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-medium">Gender</label>
                      <Select
                        value={value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            gender: event.target.value,
                          }))
                        }
                        options={[
                          { value: "", label: "Select" },
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                        ]}
                      />
                    </div>
                  );
                }
                if (key === "cds") {
                  return (
                    <div key={key} className="sm:col-span-1 md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        CDS Group <span className="text-xs text-muted-foreground font-normal">(Auto-populated when you sign up)</span>
                      </label>
                      <Input
                        value=""
                        disabled
                        placeholder="Will be automatically populated when you sign up on the CDS attendance platform"
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>
                  );
                }
                const isUppercaseField = key === "ppa" || key === "nin";
                const getLabel = (fieldKey: string) => {
                  if (fieldKey === "ppa") return "PPA";
                  if (fieldKey === "nin") return "NIN";
                  return fieldKey
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                };
                return (
                  <div key={key}>
                    <label className="mb-2 block text-sm font-medium">
                      {getLabel(key)}
                    </label>
                    <Input
                      value={value}
                      onChange={(event) => {
                        const inputValue = isUppercaseField 
                          ? event.target.value.toUpperCase() 
                          : event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          [key]: inputValue,
                        }))
                      }}
                      style={isUppercaseField ? { textTransform: 'uppercase' } : {}}
                    />
                  </div>
                );
              })}
            </div>

            {form.medical_history === "yes" && (
              <div className="rounded-lg border border-dashed p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Medical Certificates (PDF or images, max 5MB each)</p>
                    <p className="text-xs text-muted-foreground">Maximum of 3 files.</p>
                  </div>
                </div>
                <Input type="file" accept="application/pdf,image/*" multiple onChange={handleFileUpload} />
                <div className="mt-3 space-y-2">
                  {medicalFiles.map((file) => (
                    <div key={file.storageId} className="flex items-center justify-between rounded border bg-muted/50 px-3 py-2 text-sm">
                      <span className="truncate">{file.fileName}</span>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() =>
                          setMedicalFiles((prev) => prev.filter((item) => item.storageId !== file.storageId))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" disabled={disabled || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit Documentation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
