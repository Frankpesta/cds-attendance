import { buildDocumentationExportFilename } from "@/lib/utils";

export type DocumentationExportType =
  | "corp_member"
  | "rejected_reposting"
  | "employer"
  | "corp_member_request";

export async function downloadDocumentationExport(args: {
  sessionToken: string;
  type: DocumentationExportType;
  batches?: string[];
}): Promise<{ filename: string; rowCount?: number }> {
  const response = await fetch("/api/export-documentation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      sessionToken: args.sessionToken,
      type: args.type,
      batches: args.batches?.length ? args.batches : undefined,
    }),
  });

  if (!response.ok) {
    let message = "Export failed";
    try {
      const errorData = await response.json();
      message = errorData.error || message;
    } catch {
      message = `Export failed (${response.status})`;
    }
    throw new Error(message);
  }

  const rowCountHeader = response.headers.get("X-Export-Row-Count");
  const rowCount = rowCountHeader ? Number(rowCountHeader) : undefined;

  const disposition = response.headers.get("Content-Disposition");
  let filename = buildDocumentationExportFilename(
    args.type === "corp_member"
      ? "corp-members"
      : args.type === "rejected_reposting"
        ? "rejected-reposting"
        : args.type === "employer"
          ? "employers"
          : "corp-member-requests",
    args.batches,
  );
  const match = disposition?.match(/filename="([^"]+)"/);
  if (match?.[1]) filename = match[1];

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return { filename, rowCount };
}
