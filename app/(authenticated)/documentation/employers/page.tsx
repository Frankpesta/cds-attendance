"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createLinkAction,
  toggleLinkStatusAction,
  updateEmployerAction,
  deleteEmployerAction,
  batchDeleteEmployersAction,
} from "@/app/actions/documentation";
import { useDocumentationListLinks, useDocumentationListEmployers } from "@/hooks/useApiQueries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { useSessionToken } from "@/hooks/useSessionToken";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { getSessionTokenAction, getSessionAction } from "@/app/actions/session";
import { ClipboardCopy, Link2, RefreshCw, Eye, Trash2, Download } from "lucide-react";

const employerFields = [
  { key: "organization_name", label: "Organization Name" },
  { key: "organization_address", label: "Organization Address" },
  { key: "organization_phone", label: "Organization Phone" },
  { key: "contact_person_name", label: "Contact Person" },
  { key: "contact_person_phone", label: "Contact Phone" },
  { key: "cms_required_per_year", label: "CMS Needed / Year" },
  { key: "accommodation", label: "Accommodation" },
  { key: "monthly_stipend", label: "Monthly Stipend" },
  { key: "email", label: "Email" },
  { key: "nearest_landmark", label: "Nearest Landmark / Bustop" },
] as const;

function formatCurrency(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

export default function EmployersDocumentationPage() {
  const sessionToken = useSessionToken();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [accommodationFilter, setAccommodationFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string | number | boolean | undefined>>({});
  const [session, setSession] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [linksPage, setLinksPage] = useState(1);
  const linksItemsPerPage = 80;

  const queryClient = useQueryClient();
  const { data: links } = useDocumentationListLinks(sessionToken, "employer");
  const { data: employers } = useDocumentationListEmployers(sessionToken);

  const invalidateDocQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["documentation-links", "employer"] });
    queryClient.invalidateQueries({ queryKey: ["documentation-employers"] });
  };

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  useEffect(() => {
    if (selectedRecord) {
      setEditDraft({ ...selectedRecord });
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
        body: JSON.stringify({ sessionToken, type: "employer" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employers-documentation-${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const filteredEmployers = useMemo(() => {
    if (!employers) return [];
    return employers.filter((record: any) => {
      const haystack = `${record.organization_name} ${record.organization_address} ${record.contact_person_name}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesAccommodation =
        accommodationFilter === ""
          ? true
          : accommodationFilter === "yes"
          ? record.accommodation
          : !record.accommodation;
      return matchesSearch && matchesAccommodation;
    });
  }, [employers, search, accommodationFilter]);

  const paginatedLinks = useMemo(() => {
    if (!links) return [];
    const startIndex = (linksPage - 1) * linksItemsPerPage;
    const endIndex = startIndex + linksItemsPerPage;
    return links.slice(startIndex, endIndex);
  }, [links, linksPage, linksItemsPerPage]);

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
      const result = await createLinkAction("employer");
      if (!result.ok) throw new Error(result.error);
      invalidateDocQueries();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/documentation/employers/${result.data.token}`;
      await navigator.clipboard.writeText(url);
      push({ variant: "success", title: "Link created", description: "Link copied to clipboard." });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to create link", description: extractErrorMessage(error, "Failed to create link") });
    }
  };

  const handleToggleLink = async (link: any) => {
    if (!sessionToken) return;
    try {
      const res = await toggleLinkStatusAction(
        link.id ?? link._id,
        link.status === "active" ? "inactive" : "active",
      );
      if (!res.ok) throw new Error(res.error);
      invalidateDocQueries();
    } catch (error: any) {
      push({ variant: "error", title: "Unable to update link", description: extractErrorMessage(error, "Failed to update link") });
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!sessionToken) return;
    if (!confirm("Delete this employer record?")) return;
    try {
      const res = await deleteEmployerAction(recordId);
      if (!res.ok) throw new Error(res.error);
      invalidateDocQueries();
      if ((selectedRecord?.id ?? selectedRecord?._id) === recordId) {
        setSelectedRecord(null);
        setEditMode(false);
      }
      push({ variant: "success", title: "Record deleted" });
    } catch (error: any) {
      push({ variant: "error", title: "Deletion failed", description: extractErrorMessage(error, "Failed to delete record") });
    }
  };

  const handleSave = async () => {
    if (!sessionToken || !selectedRecord) return;
    try {
      const res = await updateEmployerAction(selectedRecord.id ?? selectedRecord._id, {
          organization_name: String(editDraft.organization_name || ""),
          organization_address: String(editDraft.organization_address || ""),
          organization_phone: String(editDraft.organization_phone || ""),
          contact_person_name: String(editDraft.contact_person_name || ""),
          contact_person_phone: String(editDraft.contact_person_phone || ""),
          cms_required_per_year: Number(editDraft.cms_required_per_year || 0),
          accommodation: Boolean(editDraft.accommodation),
          accommodation_type: editDraft.accommodation 
            ? (editDraft.accommodation_type ? String(editDraft.accommodation_type) : undefined)
            : undefined,
          monthly_stipend: Number(editDraft.monthly_stipend || 0),
          email: String(editDraft.email || ""),
          nearest_landmark: String(editDraft.nearest_landmark || ""),
        });
      if (!res.ok) throw new Error(res.error);
      invalidateDocQueries();
      setEditMode(false);
      push({ variant: "success", title: "Record updated" });
    } catch (error: any) {
      push({ variant: "error", title: "Update failed", description: extractErrorMessage(error, "Failed to update record") });
    }
  };

  const columns = [
    { key: "organization_name", label: "Organization" },
    { key: "contact_person_name", label: "Contact" },
    { key: "organization_phone", label: "Phone" },
    {
      key: "cms_required_per_year",
      label: "CMS / Year",
      render: (value: number) => value ?? 0,
    },
    {
      key: "accommodation",
      label: "Accommodation",
      render: (value: boolean) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            value ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
          }`}
        >
          {value ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "monthly_stipend",
      label: "Monthly Stipend",
      render: (value: number) => formatCurrency(value),
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
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(item.id ?? item._id)}>
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
          <h1 className="text-3xl font-bold tracking-tight">Employers Documentation</h1>
          <p className="text-muted-foreground">Collect employer submissions and keep them organized.</p>
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
            {links?.length || 0} total links
          </p>
        </CardHeader>
        <CardContent>
          {(!links || links.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No links generated yet.
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
                  const url = `${origin}/documentation/employers/${link.token}`;
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
                      <td>{new Date(link.created_at).toLocaleString()}</td>
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
              {Math.ceil((links?.length || 0) / linksItemsPerPage) > 1 && (
                <Pagination
                  currentPage={linksPage}
                  totalPages={Math.ceil((links?.length || 0) / linksItemsPerPage)}
                  onPageChange={setLinksPage}
                  itemsPerPage={linksItemsPerPage}
                  totalItems={links?.length || 0}
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
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Organization or contact..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Accommodation</label>
              <Select
                value={accommodationFilter}
                onChange={(event) => setAccommodationFilter(event.target.value)}
                options={[
                  { value: "", label: "All" },
                  { value: "yes", label: "Provides accommodation" },
                  { value: "no", label: "No accommodation" },
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setAccommodationFilter("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="min-w-0">
          <DataTable
            title="Employer Records"
            description={`${filteredEmployers.length} submissions${selectedIds.length > 0 ? ` • ${selectedIds.length} selected` : ""}`}
            data={filteredEmployers}
            columns={columns as any}
            selectable
            rowIdKey="_id"
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            toolbar={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(filteredEmployers.map((e: any) => e._id))}>
                  Select all filtered
                </Button>
                {selectedIds.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear selection</Button>
                    <Button variant="secondary" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setBatchDeleteDialogOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-1" />Delete selected ({selectedIds.length})
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>

        <Card className="h-fit sticky top-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Record Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord ? selectedRecord.organization_name : "Select a record to view details."}
                </p>
              </div>
              {selectedRecord && (
                <Button size="sm" variant="secondary" onClick={() => setEditMode((prev) => !prev)} className="w-full sm:w-auto">
                  {editMode ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm max-h-[calc(100vh-300px)] overflow-y-auto">
            {!selectedRecord && <p className="text-muted-foreground">Nothing selected.</p>}
            {selectedRecord && (
              <>
                {employerFields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">{field.label}</span>
                    {field.key === "accommodation" ? (
                      editMode ? (
                        <Select
                          value={editDraft.accommodation ? "true" : "false"}
                          onChange={(event) => {
                            const newAccommodation = event.target.value === "true";
                            setEditDraft((prev) => {
                              const updated: Record<string, string | number | boolean | undefined> = {
                                ...prev,
                                accommodation: newAccommodation,
                              };
                              if (!newAccommodation) {
                                updated.accommodation_type = undefined;
                              }
                              return updated;
                            });
                          }}
                          options={[
                            { value: "true", label: "Yes" },
                            { value: "false", label: "No" },
                          ]}
                        />
                      ) : (
                        <p className="font-medium">{selectedRecord.accommodation ? "Yes" : "No"}</p>
                      )
                    ) : editMode ? (
                      <Input
                        value={String(editDraft[field.key] ?? "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                      />
                    ) : field.key === "monthly_stipend" ? (
                      <p className="font-medium">{formatCurrency(selectedRecord[field.key])}</p>
                    ) : (
                      <p className="font-medium">
                        {field.key === "cms_required_per_year" ? selectedRecord[field.key] : selectedRecord[field.key] || "-"}
                      </p>
                    )}
                  </div>
                ))}

                {/* Accommodation Type Field */}
                {(selectedRecord.accommodation || (editMode && editDraft.accommodation)) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Type of Accommodation Provided</span>
                    {editMode ? (
                      <Select
                        value={String(editDraft.accommodation_type ?? selectedRecord.accommodation_type ?? "")}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEditDraft((prev) => ({
                            ...prev,
                            accommodation_type: value === "" ? undefined : value,
                          }));
                        }}
                        options={[
                          { value: "", label: "Not specified" },
                          { value: "A single room", label: "A single room" },
                          { value: "A self-contain room", label: "A self-contain room" },
                          { value: "2 or 3 bedroom flat", label: "2 or 3 bedroom flat" },
                        ]}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.accommodation_type || "-"}</p>
                    )}
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

      {batchDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="mx-4 max-w-md w-full">
            <CardHeader>
              <h3 className="text-lg font-semibold">Confirm Batch Delete</h3>
              <p className="text-sm text-muted-foreground">Delete {selectedIds.length} employer record(s)? This action cannot be undone.</p>
            </CardHeader>
            <CardContent className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setBatchDeleteDialogOpen(false)} disabled={batchDeleting}>Cancel</Button>
              <Button variant="primary" className="bg-red-600 hover:bg-red-700" disabled={batchDeleting}
                onClick={async () => {
                  setBatchDeleting(true);
                  try {
                    const res = await batchDeleteEmployersAction(selectedIds);
                    if (!res.ok) throw new Error(res.error);
                    const { deleted, errors } = res.data!;
                    setSelectedIds([]);
                    setBatchDeleteDialogOpen(false);
                    invalidateDocQueries();
                    if (selectedRecord && selectedIds.includes(selectedRecord._id)) setSelectedRecord(null);
                    push({ variant: errors.length > 0 ? "error" : "success", title: errors.length > 0 ? `Deleted ${deleted}, ${errors.length} failed` : "Records deleted", description: errors.length > 0 ? errors.slice(0, 2).join("; ") : `${deleted} record(s) deleted.` });
                  } catch (e: any) {
                    push({ variant: "error", title: "Delete failed", description: extractErrorMessage(e, "Failed to delete") });
                  } finally {
                    setBatchDeleting(false);
                  }
                }}>
                {batchDeleting ? "Deleting..." : "Yes, delete"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
