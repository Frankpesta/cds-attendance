"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockedUsersList } from "@/hooks/useApiQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { batchUnblockUsersAction, unblockUserAction } from "@/app/actions/users";
import { extractErrorMessage, cn } from "@/lib/utils";
import { Search, Unlock } from "lucide-react";

function extractBatchFromStateCode(stateCode: string): string {
  const parts = String(stateCode || "").split("/");
  return parts.length >= 2 ? parts[1] : "";
}

function batchLabelFromStateCode(stateCode: string): string {
  const b = extractBatchFromStateCode(stateCode);
  return b || "(no batch)";
}

type BlockedRow = Record<string, unknown> & {
  _id: string;
  name: string;
  state_code: string;
  email: string;
  role: string;
  blocked_reason: string | null;
};

export default function BlockedUsersPage() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { data: blocked = [], isPending } = useBlockedUsersList();
  const [searchTerm, setSearchTerm] = useState("");
  const [batchFilters, setBatchFilters] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [batchUnblockDialogOpen, setBatchUnblockDialogOpen] = useState(false);
  const [batchUnblocking, setBatchUnblocking] = useState(false);

  const batchKeys = useMemo(() => {
    const s = new Set<string>();
    blocked.forEach((row) => {
      s.add(batchLabelFromStateCode(row.state_code));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [blocked]);

  const filteredBlocked = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return blocked.filter((row) => {
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.state_code.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        Boolean(row.blocked_reason?.toLowerCase().includes(q));

      const batchLabel = batchLabelFromStateCode(row.state_code);
      const matchesBatch =
        batchFilters.length === 0 || batchFilters.includes(batchLabel);

      return matchesSearch && matchesBatch;
    });
  }, [blocked, searchTerm, batchFilters]);

  const toggleBatchFilter = (label: string) => {
    setBatchFilters((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  const invalidateBlockedLists = async () => {
    await queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const onUnblock = async (userId: string, name: string) => {
    setUnblockingId(userId);
    try {
      const res = await unblockUserAction(userId, true);
      if (!res.ok) {
        push({
          variant: "error",
          title: "Unblock failed",
          description: res.error || "Could not unblock user",
        });
        return;
      }
      push({
        variant: "success",
        title: "User unblocked",
        description: `${name} can sign in again. Device binding was reset.`,
      });
      setSelectedIds((ids) => ids.filter((id) => id !== userId));
      await invalidateBlockedLists();
    } catch (e: unknown) {
      push({
        variant: "error",
        title: "Unblock failed",
        description: extractErrorMessage(e, "Could not unblock user"),
      });
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blocked users</h1>
        <p className="text-muted-foreground">
          Accounts that cannot sign in until you unblock them (including device-lock conflicts).
        </p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Search & batches</h3>
          <p className="text-sm text-muted-foreground">
            Filter by text and one or more NYSC batches (from state code). Then select rows or use{" "}
            <strong>Select all filtered</strong> to unblock a batch group in one step.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, email, state code, role, or reason…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {batchKeys.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Batches</span>
                {batchFilters.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setBatchFilters([])}>
                    Clear batch filters
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {batchKeys.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleBatchFilter(label)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      batchFilters.includes(label)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                No batch selected = show everyone blocked. Multiple batches = show anyone in{" "}
                <em>any</em> selected batch (combined with search).
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setBatchFilters([]);
                setSelectedIds([]);
              }}
            >
              Reset filters & selection
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable<BlockedRow>
        title={isPending ? "Loading…" : "Blocked accounts"}
        description={`${filteredBlocked.length} shown${selectedIds.length > 0 ? ` • ${selectedIds.length} selected` : ""}${blocked.length !== filteredBlocked.length ? ` (of ${blocked.length} total blocked)` : ""}`}
        emptyMessage={
          blocked.length === 0
            ? "No blocked accounts."
            : "No blocked accounts match your filters."
        }
        data={filteredBlocked as BlockedRow[]}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={filteredBlocked.length === 0}
              onClick={() => setSelectedIds(filteredBlocked.map((r) => r._id))}
            >
              Select all filtered
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Clear selection
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setBatchUnblockDialogOpen(true)}
                >
                  <Unlock className="mr-1 h-4 w-4" />
                  Unblock selected ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        }
        columns={[
          {
            key: "batch",
            label: "Batch",
            render: (_, row) => batchLabelFromStateCode(row.state_code),
          },
          {
            key: "name",
            label: "Name",
            render: (_, row) => row.name,
          },
          {
            key: "state_code",
            label: "State code",
            render: (_, row) => row.state_code,
          },
          {
            key: "email",
            label: "Email",
            render: (_, row) => row.email,
          },
          {
            key: "role",
            label: "Role",
            render: (_, row) => row.role,
          },
          {
            key: "blocked_reason",
            label: "Reason",
            render: (_, row) => row.blocked_reason || "—",
          },
          {
            key: "actions",
            label: "",
            render: (_, row) => (
              <Button
                variant="primary"
                size="sm"
                disabled={unblockingId === row._id}
                onClick={() => onUnblock(row._id, row.name)}
              >
                {unblockingId === row._id ? "Unblocking…" : "Unblock"}
              </Button>
            ),
          },
        ]}
      />

      {batchUnblockDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">Unblock selected accounts?</h3>
              <p className="text-sm text-muted-foreground">
                You are about to unblock <strong>{selectedIds.length}</strong> account(s). Device
                binding will be cleared so members can sign in again from a new device.
              </p>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={batchUnblocking}
                onClick={() => !batchUnblocking && setBatchUnblockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-green-600 hover:bg-green-700"
                disabled={batchUnblocking}
                onClick={async () => {
                  setBatchUnblocking(true);
                  try {
                    const res = await batchUnblockUsersAction(selectedIds, true);
                    if (!res.ok) {
                      push({
                        variant: "error",
                        title: "Batch unblock failed",
                        description: res.error || "Could not unblock users",
                      });
                      return;
                    }
                    const { unblocked, errors } = res.data;
                    if (errors.length > 0) {
                      push({
                        variant: "error",
                        title: `Unblocked ${unblocked}, ${errors.length} error(s)`,
                        description: errors.slice(0, 5).join("; ") + (errors.length > 5 ? "…" : ""),
                      });
                    } else {
                      push({
                        variant: "success",
                        title: "Users unblocked",
                        description: `${unblocked} account(s) can sign in again.`,
                      });
                    }
                    setBatchUnblockDialogOpen(false);
                    setSelectedIds([]);
                    await invalidateBlockedLists();
                  } catch (e: unknown) {
                    push({
                      variant: "error",
                      title: "Batch unblock failed",
                      description: extractErrorMessage(e, "Could not unblock users"),
                    });
                  } finally {
                    setBatchUnblocking(false);
                  }
                }}
              >
                {batchUnblocking ? "Unblocking…" : "Yes, unblock all selected"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
