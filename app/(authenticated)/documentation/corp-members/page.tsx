"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { ClipboardCopy, Link2, RefreshCw, Eye, Trash2, Shield } from "lucide-react";
import { useSessionToken } from "@/hooks/useSessionToken";

interface MedicalFile {
  storageId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

const corpsFields = [
  { key: "full_name", label: "Full Name" },
  { key: "state_code", label: "State Code" },
  { key: "phone_number", label: "Phone Number" },
  { key: "residential_address", label: "Residential Address in Akure" },
  { key: "next_of_kin", label: "Next of Kin" },
  { key: "next_of_kin_phone", label: "Next of Kin Phone Number" },
  { key: "gender", label: "Gender" },
  { key: "ppa", label: "PPA" },
  { key: "course_of_study", label: "Course of Study" },
  { key: "call_up_number", label: "Call Up Number" },
  { key: "email", label: "Email" },
  { key: "nysc_account_number", label: "NYSC Account Number" },
  { key: "bank_name", label: "Bank Name" },
  { key: "nin", label: "NIN" },
  { key: "cds", label: "CDS" },
];

function formatDate(ms?: number) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

export default function CorpMembersDocumentationPage() {
  const sessionToken = useSessionToken();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [medicalFilter, setMedicalFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string | boolean>>({});

  const listLinks = useQuery(
    api.documentation.listLinks,
    sessionToken
      ? {
          sessionToken,
          type: "corp_member",
        }
      : "skip",
  );
  const corpMembers = useQuery(
    api.documentation.listCorpMembers,
    sessionToken ? { sessionToken } : "skip",
  );

  const createLink = useMutation(api.documentation.createLink);
  const toggleLinkStatus = useMutation(api.documentation.toggleLinkStatus);
  const updateCorpMember = useMutation(api.documentation.updateCorpMember);
  const deleteCorpMember = useMutation(api.documentation.deleteCorpMember);
  const getFileUrl = useMutation(api.documentation.getFileUrl);

  useEffect(() => {
    if (selectedRecord) {
      setEditDraft({
        ...selectedRecord,
        medical_history: selectedRecord.medical_history,
      });
    } else {
      setEditDraft({});
    }
  }, [selectedRecord]);

  const filteredMembers = useMemo(() => {
    if (!corpMembers) return [];
    return corpMembers.filter((member: any) => {
      const haystack = `${member.full_name} ${member.state_code} ${member.phone_number} ${member.ppa}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesGender = genderFilter ? member.gender === genderFilter : true;
      const matchesMedical =
        medicalFilter === ""
          ? true
          : medicalFilter === "yes"
          ? member.medical_history
          : !member.medical_history;
      return matchesSearch && matchesGender && matchesMedical;
    });
  }, [corpMembers, search, genderFilter, medicalFilter]);

  const handleCreateLink = async () => {
    if (!sessionToken) return;
    try {
      const result = await createLink({ sessionToken, type: "corp_member" });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/documentation/corp-members/${result.token}`;
      await navigator.clipboard.writeText(url);
      push({
        variant: "success",
        title: "Link created",
        description: "New registration link copied to clipboard.",
      });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to create link", description: error?.message });
    }
  };

  const handleToggleLink = async (link: any) => {
    if (!sessionToken) return;
    try {
      await toggleLinkStatus({
        sessionToken,
        linkId: link._id,
        status: link.status === "active" ? "inactive" : "active",
      });
    } catch (error: any) {
      push({ variant: "error", title: "Unable to update link", description: error?.message });
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!sessionToken) return;
    if (!confirm("Delete this record? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteCorpMember({ sessionToken, id: recordId });
      if (selectedRecord?._id === recordId) {
        setSelectedRecord(null);
        setEditMode(false);
      }
      push({ variant: "success", title: "Record deleted" });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to delete", description: error?.message });
    }
  };

  const handleSave = async () => {
    if (!sessionToken || !selectedRecord) return;
    try {
      await updateCorpMember({
        sessionToken,
        id: selectedRecord._id,
        updates: {
          full_name: String(editDraft.full_name || ""),
          state_code: String(editDraft.state_code || ""),
          phone_number: String(editDraft.phone_number || ""),
          residential_address: String(editDraft.residential_address || ""),
          next_of_kin: String(editDraft.next_of_kin || ""),
          next_of_kin_phone: String(editDraft.next_of_kin_phone || ""),
          gender: String(editDraft.gender || ""),
          ppa: String(editDraft.ppa || ""),
          course_of_study: String(editDraft.course_of_study || ""),
          call_up_number: String(editDraft.call_up_number || ""),
          email: String(editDraft.email || ""),
          nysc_account_number: String(editDraft.nysc_account_number || ""),
          bank_name: String(editDraft.bank_name || ""),
          nin: String(editDraft.nin || ""),
          cds: String(editDraft.cds || ""),
          medical_history: Boolean(editDraft.medical_history),
        },
        medical_files:
          Boolean(editDraft.medical_history) && selectedRecord.medical_files
            ? (selectedRecord.medical_files as MedicalFile[])
            : [],
      });
      setEditMode(false);
      push({ variant: "success", title: "Record updated" });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to update", description: error?.message });
    }
  };

  const handleDownload = async (file: MedicalFile) => {
    if (!sessionToken) return;
    try {
      const signedUrl = await getFileUrl({ sessionToken, fileId: file.storageId as any });
      window.open(signedUrl, "_blank");
    } catch (error: any) {
      push({ variant: "error", title: "Download failed", description: error?.message });
    }
  };

  const columns = [
    { key: "full_name", label: "Full Name" },
    { key: "state_code", label: "State Code" },
    { key: "phone_number", label: "Phone" },
    {
      key: "gender",
      label: "Gender",
      render: (value: string) => value || "-",
    },
    { key: "ppa", label: "PPA" },
    {
      key: "created_at",
      label: "Submitted",
      render: (value: number) => new Date(value).toLocaleDateString(),
    },
    {
      key: "medical_history",
      label: "Medical History",
      render: (value: boolean) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            value ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {value ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, item: any) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedRecord(item);
              setEditMode(false);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(item._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Corps Members Documentation</h1>
          <p className="text-muted-foreground">Create secure registration links and manage submitted records.</p>
        </div>
        <Button onClick={handleCreateLink} disabled={!sessionToken}>
          <Link2 className="mr-2 h-4 w-4" />
          Create Registration Link
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Registration Links</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Token</th>
                  <th>Status</th>
                  <th>Uses</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(listLinks || []).map((link: any) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const url = `${origin}/documentation/corp-members/${link.token}`;
                  return (
                    <tr key={link._id} className="border-b">
                      <td className="py-2 font-mono text-xs">{link.token}</td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            link.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {link.status}
                        </span>
                      </td>
                      <td>{link.uses_count}</td>
                      <td>{formatDate(link.created_at)}</td>
                      <td className="flex gap-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(url);
                            push({ variant: "success", title: "Link copied" });
                          }}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleLink(link)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(!listLinks || listLinks.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      No links yet. Create the first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Search</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, PPA..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Gender</label>
              <Select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                options={[
                  { value: "", label: "All" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Medical History</label>
              <Select
                value={medicalFilter}
                onChange={(event) => setMedicalFilter(event.target.value)}
                options={[
                  { value: "", label: "All" },
                  { value: "yes", label: "Has history" },
                  { value: "no", label: "No history" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <DataTable
          title="Submitted Records"
          description={`${filteredMembers.length} corps members`}
          data={filteredMembers}
          columns={columns as any}
        />

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Record Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord ? selectedRecord.full_name : "Select a record to view details."}
                </p>
              </div>
              {selectedRecord && (
                <Button size="sm" variant="secondary" onClick={() => setEditMode((prev) => !prev)}>
                  {editMode ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!selectedRecord && <p className="text-muted-foreground">Nothing selected.</p>}
            {selectedRecord && (
              <>
                <div className="space-y-3">
                  {corpsFields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-muted-foreground">{field.label}</span>
                      {editMode ? (
                        <Input
                          value={String(editDraft[field.key] ?? "")}
                          onChange={(event) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <p className="font-medium">{selectedRecord[field.key] || "-"}</p>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Medical History</span>
                    {editMode ? (
                      <Select
                        value={editDraft.medical_history ? "true" : "false"}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            medical_history: event.target.value === "true",
                          }))
                        }
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.medical_history ? "Yes" : "No"}</p>
                    )}
                  </div>
                </div>

                {selectedRecord.medical_history && (
                  <div className="rounded-lg border border-dashed p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Shield className="h-4 w-4" />
                      Medical Certificates
                    </div>
                    {(selectedRecord.medical_files || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No documents uploaded.</p>
                    )}
                    <div className="space-y-2">
                      {(selectedRecord.medical_files || []).map((file: MedicalFile) => (
                        <Button
                          key={file.storageId}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => handleDownload(file)}
                        >
                          <span className="truncate text-left">{file.fileName}</span>
                          <span className="text-xs text-muted-foreground">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {editMode && (
                  <Button className="w-full" onClick={handleSave}>
                    Save Changes
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
