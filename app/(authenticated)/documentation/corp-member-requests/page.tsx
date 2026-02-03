"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useDocumentationListLinks, useDocumentationListCorpMemberRequests } from "@/hooks/useConvexQueries";
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

export default function CorpMemberRequestsDocumentationPage() {
  const sessionToken = useSessionToken();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string | number | boolean>>({});
  const [session, setSession] = useState<any | null>(null);
  const [linksPage, setLinksPage] = useState(1);
  const linksItemsPerPage = 80;
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();
  const { data: listLinks } = useDocumentationListLinks(sessionToken, "corp_member_request");
  const { data: records } = useDocumentationListCorpMemberRequests(sessionToken);

  const createLink = useMutation(api.documentation.createLink);
  const toggleLinkStatus = useMutation(api.documentation.toggleLinkStatus);
  const updateRecord = useMutation(api.documentation.updateCorpMemberRequest);
  const deleteRecord = useMutation(api.documentation.deleteCorpMemberRequest);

  const invalidateDocQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["convexQuery", api.documentation.listLinks] });
    queryClient.invalidateQueries({ queryKey: ["convexQuery", api.documentation.listCorpMemberRequests] });
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
        ppa_name: selectedRecord.ppa_name || "",
        ppa_address: selectedRecord.ppa_address || "",
        ppa_phone_number: selectedRecord.ppa_phone_number || "",
        number_of_corp_members_requested: selectedRecord.number_of_corp_members_requested || 0,
        discipline_needed: selectedRecord.discipline_needed || "",
        gender_needed: selectedRecord.gender_needed || "",
        monthly_stipend: selectedRecord.monthly_stipend || 0,
        available_accommodation: selectedRecord.available_accommodation || false,
      });
    } else {
      setEditDraft({});
    }
  }, [selectedRecord]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((record: any) => {
      const haystack = `${record.ppa_name} ${record.ppa_address} ${record.ppa_phone_number} ${record.discipline_needed}`.toLowerCase();
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
      const result = await createLink({ sessionToken: token, type: "corp_member_request" });
      invalidateDocQueries();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/documentation/corp-member-requests/${result.token}`;
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

  const handleDelete = async (recordId: Id<"corp_member_requests">) => {
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
          ppa_name: editDraft.ppa_name ? String(editDraft.ppa_name) : undefined,
          ppa_address: editDraft.ppa_address ? String(editDraft.ppa_address) : undefined,
          ppa_phone_number: editDraft.ppa_phone_number ? String(editDraft.ppa_phone_number) : undefined,
          number_of_corp_members_requested: editDraft.number_of_corp_members_requested ? Number(editDraft.number_of_corp_members_requested) : undefined,
          discipline_needed: editDraft.discipline_needed ? String(editDraft.discipline_needed) : undefined,
          gender_needed: editDraft.gender_needed ? String(editDraft.gender_needed) : undefined,
          monthly_stipend: editDraft.monthly_stipend ? Number(editDraft.monthly_stipend) : undefined,
          available_accommodation: editDraft.available_accommodation !== undefined ? Boolean(editDraft.available_accommodation) : undefined,
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
        body: JSON.stringify({ sessionToken, type: "corp_member_request" }),
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
      a.download = `corp-member-requests${dateSuffix}-${new Date().toISOString().split("T")[0]}.xlsx`;
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
          <title>Corp Member Requests${dateLabel}</title>
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
            .summary {
              margin-top: 15px;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <h1>Corp Member Requests${dateLabel}</h1>
          <div class="header-info">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Requests:</strong> ${printData.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>PPA Name</th>
                <th>PPA Address</th>
                <th>Phone Number</th>
                <th>Members Requested</th>
                <th>Discipline</th>
                <th>Gender</th>
                <th>Monthly Stipend</th>
                <th>Accommodation</th>
                <th>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${printData.map((record: any, index: number) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${(record.ppa_name || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.ppa_address || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.ppa_phone_number || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td style="text-align: center;">${record.number_of_corp_members_requested || 0}</td>
                  <td>${(record.discipline_needed || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>${(record.gender_needed || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td>₦${Number(record.monthly_stipend || 0).toLocaleString()}</td>
                  <td style="text-align: center;">${record.available_accommodation ? "Yes" : "No"}</td>
                  <td>${formatDate(record.created_at)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Summary:</strong> ${printData.length} request(s)${dateLabel}</p>
            <p><strong>Total Members Requested:</strong> ${printData.reduce((sum: number, r: any) => sum + (r.number_of_corp_members_requested || 0), 0)}</p>
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
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
    
    push({ variant: "success", title: "Print dialog opened", description: "Use your browser's print options to save as PDF" });
  };

  const columns = [
    { key: "ppa_name", label: "PPA Name" },
    { key: "ppa_address", label: "Address" },
    { key: "ppa_phone_number", label: "Phone" },
    { 
      key: "number_of_corp_members_requested", 
      label: "Members Requested",
      render: (value: number) => value || 0,
    },
    { key: "discipline_needed", label: "Discipline" },
    { key: "gender_needed", label: "Gender" },
    {
      key: "monthly_stipend",
      label: "Monthly Stipend",
      render: (value: number) => `₦${Number(value || 0).toLocaleString()}`,
    },
    {
      key: "available_accommodation",
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
          <h1 className="text-3xl font-bold tracking-tight">Corp Member Requests Desk</h1>
          <p className="text-muted-foreground">Create secure registration links and manage submitted requests from employers.</p>
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
                  const url = `${origin}/documentation/corp-member-requests/${link.token}`;
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
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="PPA name, address, phone..." />
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
            title="Submitted Requests"
            description={`${filteredRecords.length} requests`}
            data={filteredRecords}
            columns={columns as any}
          />
        </div>

        <Card className="h-fit sticky top-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Request Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord ? selectedRecord.ppa_name : "Select a request to view details."}
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
                    <span className="text-xs uppercase text-muted-foreground">PPA Name</span>
                    {editMode ? (
                      <Input
                        type="text"
                        value={String(editDraft.ppa_name || "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            ppa_name: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium break-words">{selectedRecord.ppa_name || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">PPA Address</span>
                    {editMode ? (
                      <Input
                        type="text"
                        value={String(editDraft.ppa_address || "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            ppa_address: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium break-words">{selectedRecord.ppa_address || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">PPA Phone Number</span>
                    {editMode ? (
                      <Input
                        type="text"
                        value={String(editDraft.ppa_phone_number || "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            ppa_phone_number: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.ppa_phone_number || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Number of Corp Members Requested</span>
                    {editMode ? (
                      <Input
                        type="number"
                        value={typeof editDraft.number_of_corp_members_requested === "number" ? editDraft.number_of_corp_members_requested : 0}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            number_of_corp_members_requested: parseInt(event.target.value) || 0,
                          }))
                        }
                        className="w-full"
                        min="1"
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.number_of_corp_members_requested || 0}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Discipline Needed</span>
                    {editMode ? (
                      <Input
                        type="text"
                        value={String(editDraft.discipline_needed || "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            discipline_needed: event.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.discipline_needed || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Gender Needed</span>
                    {editMode ? (
                      <Select
                        value={String(editDraft.gender_needed || "")}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
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
                    ) : (
                      <p className="font-medium">{selectedRecord.gender_needed || "-"}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Monthly Stipend</span>
                    {editMode ? (
                      <Input
                        type="number"
                        value={typeof editDraft.monthly_stipend === "number" ? editDraft.monthly_stipend : 0}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            monthly_stipend: parseFloat(event.target.value) || 0,
                          }))
                        }
                        className="w-full"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="font-medium">₦{Number(selectedRecord.monthly_stipend || 0).toLocaleString()}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Available Accommodation</span>
                    {editMode ? (
                      <Select
                        value={editDraft.available_accommodation ? "true" : "false"}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            available_accommodation: event.target.value === "true",
                          }))
                        }
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                      />
                    ) : (
                      <p className="font-medium">{selectedRecord.available_accommodation ? "Yes" : "No"}</p>
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
