"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useDocumentationListLinks, useDocumentationListRejectedReposting } from "@/hooks/useConvexQueries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { ClipboardCopy, Link2, RefreshCw, Eye, Trash2, Download, Printer, Edit } from "lucide-react";
import { useSessionToken } from "@/hooks/useSessionToken";
import { getSessionTokenAction, getSessionAction } from "@/app/actions/session";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(ms?: number) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

function formatDateOnly(ms?: number) {
  if (!ms) return "-";
  return new Date(ms).toLocaleDateString();
}

export default function RejectedRepostingDocumentationPage() {
  const sessionToken = useSessionToken();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [session, setSession] = useState<any | null>(null);
  const [linksPage, setLinksPage] = useState(1);
  const linksItemsPerPage = 80;
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();
  const { data: listLinks } = useDocumentationListLinks(sessionToken, "rejected_reposting");
  const { data: records } = useDocumentationListRejectedReposting(sessionToken);

  const createLink = useMutation(api.documentation.createLink);
  const toggleLinkStatus = useMutation(api.documentation.toggleLinkStatus);
  const updateRecord = useMutation(api.documentation.updateRejectedReposting);
  const deleteRecord = useMutation(api.documentation.deleteRejectedReposting);

  const invalidateDocQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["convexQuery", api.documentation.listLinks] });
    queryClient.invalidateQueries({ queryKey: ["convexQuery", api.documentation.listRejectedReposting] });
  };

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  useEffect(() => {
    if (selectedRecord) {
      setEditDraft({
        name: selectedRecord.name || "",
        state_code: selectedRecord.state_code || "",
        sex: selectedRecord.sex || "",
        discipline: selectedRecord.discipline || "",
        previous_ppa: selectedRecord.previous_ppa || "",
        new_ppa: selectedRecord.new_ppa || "",
        recommendation: selectedRecord.recommendation || "",
      });
    } else {
      setEditDraft({});
    }
  }, [selectedRecord]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((record: any) => {
      const haystack = `${record.name} ${record.state_code} ${record.discipline} ${record.previous_ppa} ${record.new_ppa || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      
      // Date filtering - filter by date only (not time)
      let matchesDate = true;
      if (selectedDate) {
        const recordDate = formatDateOnly(record.created_at);
        matchesDate = recordDate === selectedDate;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [records, search, selectedDate]);

  const paginatedLinks = useMemo(() => {
    if (!listLinks) return [];
    const startIndex = (linksPage - 1) * linksItemsPerPage;
    const endIndex = startIndex + linksItemsPerPage;
    return listLinks.slice(startIndex, endIndex);
  }, [listLinks, linksPage, linksItemsPerPage]);

  const handleCreateLink = async () => {
    let token = sessionToken;
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
      const result = await createLink({ sessionToken: token, type: "rejected_reposting" });
      invalidateDocQueries();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/documentation/rejected-reposting/${result.token}`;
      await navigator.clipboard.writeText(url);
      push({
        variant: "success",
        title: "Link created",
        description: "New registration link copied to clipboard.",
      });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to create link", description: extractErrorMessage(error, "Failed to create link") });
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
      invalidateDocQueries();
    } catch (error: any) {
      push({ variant: "error", title: "Unable to update link", description: extractErrorMessage(error, "Failed to update link") });
    }
  };

  const handleDelete = async (recordId: Id<"rejected_reposting_docs">) => {
    if (!sessionToken) return;
    if (!confirm("Delete this record? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteRecord({ sessionToken, id: recordId });
      invalidateDocQueries();
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
      await updateRecord({
        sessionToken,
        id: selectedRecord._id,
        updates: {
          name: editDraft.name || "",
          state_code: editDraft.state_code || "",
          sex: editDraft.sex || "",
          discipline: editDraft.discipline || "",
          previous_ppa: editDraft.previous_ppa || "",
          new_ppa: editDraft.new_ppa || undefined,
          recommendation: editDraft.recommendation || undefined,
        },
      });
      invalidateDocQueries();
      setEditMode(false);
      push({ variant: "success", title: "Record updated" });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to update", description: extractErrorMessage(error, "Failed to update record") });
    }
  };

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
        body: JSON.stringify({ sessionToken, type: "rejected_reposting" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateSuffix = selectedDate ? `-${selectedDate.replace(/\//g, "-")}` : "";
      a.download = `rejected-reposting-documentation${dateSuffix}-${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const handlePrint = () => {
    const printData = selectedDate ? filteredRecords : records || [];
    if (printData.length === 0) {
      push({ variant: "error", title: "No records", description: "No records to print" });
      return;
    }

    const dateLabel = selectedDate ? ` for ${selectedDate}` : "";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Rejected/Reposting Corp Members${dateLabel}</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
                size: A4 landscape;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
            }
            h1 { 
              color: #333; 
              border-bottom: 2px solid #008751; 
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header-info {
              margin-bottom: 15px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 8px; 
              text-align: left;
              word-wrap: break-word;
            }
            th { 
              background-color: #008751; 
              color: white; 
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .no-data { 
              text-align: center; 
              padding: 20px; 
              color: #666; 
            }
            .summary {
              margin-top: 15px;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <h1>Rejected/Reposting Corp Members${dateLabel}</h1>
          <div class="header-info">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Records:</strong> ${printData.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Name</th>
                <th>State Code</th>
                <th>Sex</th>
                <th>Discipline</th>
                <th>Previous PPA</th>
                <th>New PPA</th>
                <th>Recommendation</th>
                <th>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${printData.map((record: any, index: number) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${(record.name || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.state_code || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.sex || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.discipline || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.previous_ppa || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.new_ppa || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.recommendation || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${formatDate(record.created_at)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Summary:</strong> ${printData.length} record(s)${dateLabel}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      push({ variant: "error", title: "Print failed", description: "Please allow pop-ups to print" });
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Don't close immediately - let user cancel print dialog if needed
      // printWindow.close();
    }, 250);
    
    push({ variant: "success", title: "Print dialog opened", description: "Use your browser's print options to save as PDF" });
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "state_code", label: "State Code" },
    { key: "sex", label: "Sex" },
    { key: "discipline", label: "Discipline" },
    { key: "previous_ppa", label: "Previous PPA" },
    { key: "new_ppa", label: "New PPA", render: (value: string) => value || "-" },
    {
      key: "created_at",
      label: "Submitted",
      render: (value: number) => formatDate(value),
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

  // Get unique dates from records for the date filter
  const availableDates = useMemo(() => {
    if (!records) return [];
    const dates = new Set<string>();
    records.forEach((record: any) => {
      const dateStr = formatDateOnly(record.created_at);
      if (dateStr !== "-") {
        dates.add(dateStr);
      }
    });
    return Array.from(dates).sort().reverse();
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rejected/Reposting Corp Members Desk</h1>
          <p className="text-muted-foreground">Create secure registration links and manage submitted records.</p>
        </div>
        <div className="flex gap-2">
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
                  const url = `${origin}/documentation/rejected-reposting/${link.token}`;
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
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Search</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, state code, discipline..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Date</label>
              <Select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                options={[
                  { value: "", label: "All dates" },
                  ...availableDates.map((date) => ({ value: date, label: date })),
                ]}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleExportExcel} disabled={exporting} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="mr-2 h-4 w-4" />
              Print/PDF {selectedDate ? `(${selectedDate})` : "All Records"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="min-w-0">
          <DataTable
            title="Submitted Records"
            description={`${filteredRecords.length} records`}
            data={filteredRecords}
            columns={columns as any}
          />
        </div>

        <Card className="h-fit sticky top-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Record Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord ? selectedRecord.name : "Select a record to view details."}
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
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Name</span>
                    {editMode ? (
                      <Input
                        value={editDraft.name || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium break-words">{selectedRecord.name || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">State Code</span>
                    {editMode ? (
                      <Input
                        value={editDraft.state_code || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            state_code: event.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full"
                        style={{ textTransform: 'uppercase' }}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.state_code || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Sex</span>
                    {editMode ? (
                      <Select
                        value={editDraft.sex || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
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
                    ) : (
                      <p className="font-medium">{selectedRecord.sex || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Discipline</span>
                    {editMode ? (
                      <Input
                        value={editDraft.discipline || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            discipline: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.discipline || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Previous PPA</span>
                    {editMode ? (
                      <Input
                        value={editDraft.previous_ppa || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            previous_ppa: event.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full"
                        style={{ textTransform: 'uppercase' }}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.previous_ppa || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">New PPA (Optional)</span>
                    {editMode ? (
                      <Input
                        type="text"
                        value={editDraft.new_ppa || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            new_ppa: event.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full"
                        style={{ textTransform: 'uppercase' }}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.new_ppa || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Recommendation (Optional)</span>
                    {editMode ? (
                      <Input
                        value={editDraft.recommendation || ""}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            recommendation: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.recommendation || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Date Submitted</span>
                    <p className="font-medium">{formatDate(selectedRecord.created_at)}</p>
                  </div>
                </div>

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

