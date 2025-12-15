"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { ClipboardCopy, Link2, RefreshCw, Eye, Trash2, Shield, Download } from "lucide-react";
import { useSessionToken } from "@/hooks/useSessionToken";
import { getSessionTokenAction, getSessionAction } from "@/app/actions/session";
import type { Id } from "@/convex/_generated/dataModel";

interface MedicalFile {
  storageId: Id<"_storage">;
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
  const [session, setSession] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [linksPage, setLinksPage] = useState(1);
  const linksItemsPerPage = 80;

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
  
  // Fetch CDS groups for dropdown
  const cdsGroups = useQuery(api.cds_groups.list, {});

  const createLink = useMutation(api.documentation.createLink);
  const toggleLinkStatus = useMutation(api.documentation.toggleLinkStatus);
  const updateCorpMember = useMutation(api.documentation.updateCorpMember);
  const deleteCorpMember = useMutation(api.documentation.deleteCorpMember);
  const getFileUrl = useMutation(api.documentation.getFileUrl);

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

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

  const handleExportExcel = async () => {
    if (!sessionToken) {
      push({ variant: "error", title: "Error", description: "Session token not available" });
      return;
    }
    setExporting(true);
    try {
      const response = await fetch("/api/export-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, type: "corp_member" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `corp-members-documentation-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      push({ variant: "success", title: "Export successful", description: "Excel file downloaded" });
    } catch (error: any) {
      push({ variant: "error", title: "Export failed", description: extractErrorMessage(error, "Failed to export") });
    } finally {
      setExporting(false);
    }
  };

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

  const paginatedLinks = useMemo(() => {
    if (!listLinks) return [];
    const startIndex = (linksPage - 1) * linksItemsPerPage;
    const endIndex = startIndex + linksItemsPerPage;
    return listLinks.slice(startIndex, endIndex);
  }, [listLinks, linksPage, linksItemsPerPage]);

  const handleCreateLink = async () => {
    let token = sessionToken;
    // Fallback: try to get token from server if hook hasn't loaded yet
    if (!token) {
      try {
        token = await getSessionTokenAction();
      } catch (error) {
        console.error("Error fetching session token:", error);
      }
    }
    if (!token) {
      push({ variant: "error", title: "Session Error", description: "Please refresh the page and try again." });
      return;
    }
    try {
      const result = await createLink({ sessionToken: token, type: "corp_member" });
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
      push({ variant: "error", title: "Unable to update link", description: extractErrorMessage(error, "Failed to update link") });
    }
  };

  const handleDelete = async (recordId: Id<"corp_member_docs">) => {
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
      push({ variant: "error", title: "Failed to delete", description: extractErrorMessage(error, "Failed to delete record") });
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
          cds: editDraft.cds ? String(editDraft.cds) : undefined,
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
      push({ variant: "error", title: "Failed to update", description: extractErrorMessage(error, "Failed to update record") });
    }
  };

  const handleDownload = async (file: MedicalFile) => {
    if (!sessionToken) return;
    try {
      const signedUrl = await getFileUrl({ sessionToken, fileId: file.storageId });
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        throw new Error("Unable to generate download link.");
      }
    } catch (error: any) {
      push({ variant: "error", title: "Download failed", description: extractErrorMessage(error, "Failed to download file") });
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
        <div className="flex gap-2">
          {session?.user?.role === "super_admin" && (
            <Button onClick={handleExportExcel} loading={exporting} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          )}
          <Button onClick={handleCreateLink}>
            <Link2 className="mr-2 h-4 w-4" />
            Create Registration Link
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Registration Links</h2>
          <p className="text-sm text-muted-foreground">
            {listLinks?.length || 0} total links
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!listLinks || listLinks.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No links yet. Create the first one above.
            </div>
          ) : (
            <>
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
                    {paginatedLinks.map((link: any) => {
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
                  </tbody>
                </table>
              </div>
              {Math.ceil((listLinks?.length || 0) / linksItemsPerPage) > 1 && (
                <Pagination
                  currentPage={linksPage}
                  totalPages={Math.ceil((listLinks?.length || 0) / linksItemsPerPage)}
                  onPageChange={setLinksPage}
                  itemsPerPage={linksItemsPerPage}
                  totalItems={listLinks?.length || 0}
                />
              )}
            </>
          )}
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
        <div className="min-w-0">
          <DataTable
            title="Submitted Records"
            description={`${filteredMembers.length} corps members`}
            data={filteredMembers}
            columns={columns as any}
          />
        </div>

        <Card className="h-fit sticky top-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Record Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord ? selectedRecord.full_name : "Select a record to view details."}
                </p>
              </div>
              {selectedRecord && (
                <Button size="sm" variant="secondary" onClick={() => setEditMode((prev) => !prev)} className="w-full sm:w-auto">
                  {editMode ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm max-h-[calc(100vh-300px)] overflow-y-auto">
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
                          className="w-full"
                        />
                      ) : (
                        <p className="font-medium break-words">{selectedRecord[field.key] || "-"}</p>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">CDS Group</span>
                    {editMode ? (
                      <Select
                        value={String(editDraft.cds ?? selectedRecord.cds ?? "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            cds: event.target.value,
                          }))
                        }
                        options={[
                          { value: "", label: "Select CDS Group..." },
                          ...(cdsGroups?.map((group) => ({
                            value: group.name,
                            label: group.name,
                          })) || []),
                        ]}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.cds || "-"}</p>
                    )}
                  </div>

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

                {/* SAED Information Section */}
                {(selectedRecord.personal_skill || selectedRecord.saed_camp_skill || selectedRecord.proposed_post_camp_saed_skill) && (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-primary">SAED Information</h4>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-muted-foreground">Personal Skill</span>
                      <p className="font-medium">{selectedRecord.personal_skill || "-"}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-muted-foreground">SAED Camp Skill</span>
                      <p className="font-medium">{selectedRecord.saed_camp_skill || "-"}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-muted-foreground">Proposed Post Camp SAED Skill</span>
                      <p className="font-medium">{selectedRecord.proposed_post_camp_saed_skill || "-"}</p>
                    </div>

                    {selectedRecord.selected_trainer_name && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <h5 className="text-xs font-semibold text-primary">Selected Trainer</h5>
                        <div className="space-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">Name:</span>{" "}
                            <span className="font-medium">{selectedRecord.selected_trainer_name}</span>
                          </div>
                          {selectedRecord.selected_trainer_business && (
                            <div>
                              <span className="text-muted-foreground">Business:</span>{" "}
                              <span className="font-medium">{selectedRecord.selected_trainer_business}</span>
                            </div>
                          )}
                          {selectedRecord.selected_trainer_phone && (
                            <div>
                              <span className="text-muted-foreground">Phone:</span>{" "}
                              <span className="font-medium">{selectedRecord.selected_trainer_phone}</span>
                            </div>
                          )}
                          {selectedRecord.selected_trainer_email && (
                            <div>
                              <span className="text-muted-foreground">Email:</span>{" "}
                              <span className="font-medium break-all">{selectedRecord.selected_trainer_email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={handleSave}>
                      Save Changes
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
