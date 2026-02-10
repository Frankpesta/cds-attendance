"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDocumentationValidateLink } from "@/hooks/useConvexQueries";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { Shield } from "lucide-react";

interface MedicalFile {
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  contentType: string;
}

const STATE_CODE_PREFIX = "OD/26A/";

const REQUIRED_FIELDS = new Set([
  "surname", "first_name", "state_code_digits", "phone_number", "residential_address",
  "next_of_kin", "next_of_kin_phone", "gender", "ppa", "course_of_study", "call_up_number",
  "email", "nysc_account_number", "bank_name", "nin", "medical_history",
]);

const initialForm = {
  surname: "",
  first_name: "",
  state_code_digits: "",
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
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState(initialForm);
  const [medicalFiles, setMedicalFiles] = useState<MedicalFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: link } = useDocumentationValidateLink(params.token, "corp_member");

  const submitCorpMember = useMutation(api.documentation.submitCorpMember);
  const generateUploadUrl = useMutation(api.documentation.generateUploadUrl);

  const disabled = useMemo(
    () =>
      !form.surname?.trim() ||
      !form.first_name?.trim() ||
      form.state_code_digits.length !== 4 ||
      !form.phone_number?.trim() ||
      !form.residential_address?.trim() ||
      !form.next_of_kin?.trim() ||
      !form.next_of_kin_phone?.trim() ||
      !form.gender?.trim() ||
      !form.ppa?.trim() ||
      !form.course_of_study?.trim() ||
      !form.call_up_number?.trim() ||
      !form.email?.trim() ||
      !form.nysc_account_number?.trim() ||
      !form.bank_name?.trim() ||
      !form.nin?.trim() ||
      (form.medical_history === "yes" && medicalFiles.length === 0) ||
      !acceptedTerms,
    [form, medicalFiles, acceptedTerms],
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
        push({ variant: "error", title: "Upload failed", description: extractErrorMessage(error, "Failed to upload file") });
      }
    }
    setMedicalFiles(next);
    event.target.value = "";
  };

  const handleSubmit = async () => {
    if (!link || !link.token) return;
    setSubmitting(true);
    try {
      const { surname, first_name, state_code_digits, ...rest } = form;
      const full_name = `${(surname || "").trim()} ${(first_name || "").trim()}`.trim();
      const state_code = STATE_CODE_PREFIX + (state_code_digits || "").replace(/\D/g, "").slice(0, 4);
      const result = await submitCorpMember({
        token: link.token,
        payload: {
          ...rest,
          full_name,
          state_code,
          medical_history: form.medical_history === "yes",
        },
        medical_files: form.medical_history === "yes" ? medicalFiles : [],
      });
      push({ variant: "success", title: "Documentation submitted", description: "Redirecting to SAED selection..." });
      // Redirect to SAED page using the link token
      setTimeout(() => {
        router.push(`/documentation/corp-members/${link.token}/saed`);
      }, 1000);
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
              {/* Surname and First name — both required */}
              <div>
                <label className="mb-2 block text-sm font-medium">Surname <span className="text-destructive">*</span></label>
                <Input
                  value={form.surname}
                  onChange={(e) => setForm((prev) => ({ ...prev, surname: e.target.value }))}
                  placeholder="e.g. Okonkwo"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">First name <span className="text-destructive">*</span></label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="e.g. Chidi"
                />
              </div>
              {/* State code: fixed prefix OD/26A/ + 4 digits only */}
              <div className="sm:col-span-1 md:col-span-2">
                <label className="mb-2 block text-sm font-medium">State code <span className="text-destructive">*</span></label>
                <div className="flex items-center gap-0 rounded-md border border-input bg-background overflow-hidden">
                  <span className="inline-flex items-center px-3 py-2 text-sm bg-muted border-r border-input select-none text-muted-foreground font-mono">
                    {STATE_CODE_PREFIX}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.state_code_digits}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm((prev) => ({ ...prev, state_code_digits: digits }));
                    }}
                    placeholder="1234"
                    className="rounded-none border-0 focus-visible:ring-2 focus-visible:ring-ring w-24 font-mono"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Enter only the 4 digits after {STATE_CODE_PREFIX}</p>
              </div>
              {Object.entries(form).map(([key, value]) => {
                if (key === "surname" || key === "first_name" || key === "state_code_digits") return null;
                if (key === "medical_history") {
                  return (
                    <div key={key} className="sm:col-span-1 md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Medical History <span className="text-destructive">*</span>
                      </label>
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
                      <label className="mb-2 block text-sm font-medium">Gender <span className="text-destructive">*</span></label>
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
                const isRequired = REQUIRED_FIELDS.has(key);
                return (
                  <div key={key}>
                    <label className="mb-2 block text-sm font-medium">
                      {getLabel(key)}
                      {isRequired && <span className="text-destructive"> *</span>}
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

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1 text-sm">
                  <span className="font-medium">I acknowledge and accept</span> that I am submitting sensitive personal information including financial details, medical history, and contact information. I understand that this information will be managed in accordance with the Information Management and Security Policy, and I consent to the collection, storage, and processing of this data for the purposes of NYSC CDS documentation and administration.
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
