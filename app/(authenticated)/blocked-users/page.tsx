"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockedUsersList } from "@/hooks/useApiQueries";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { unblockUserAction } from "@/app/actions/users";
import { extractErrorMessage } from "@/lib/utils";

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
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

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
      await queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
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

      <DataTable<BlockedRow>
        title={isPending ? "Loading…" : `${blocked.length} blocked account(s)`}
        emptyMessage="No blocked accounts."
        data={blocked as BlockedRow[]}
        columns={[
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
    </div>
  );
}
