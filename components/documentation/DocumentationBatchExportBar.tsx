"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentationBatchExportBarProps = {
  batchKeys: string[];
  batchFilters: string[];
  onToggleBatch: (label: string) => void;
  onClearBatchFilters: () => void;
  onExportAll: () => void;
  onExportSelectedBatches: () => void;
  exporting: boolean;
  /** When true, batch chips are shown only in the filter section above. */
  hideBatchPicker?: boolean;
};

export function DocumentationBatchExportBar({
  batchKeys,
  batchFilters,
  onToggleBatch,
  onClearBatchFilters,
  onExportAll,
  onExportSelectedBatches,
  exporting,
  hideBatchPicker = false,
}: DocumentationBatchExportBarProps) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <p className="text-sm font-medium">Export by batch</p>
        <p className="text-xs text-muted-foreground">
          Batches come from the state code (e.g. AK/A1/1234 → A1). Only batches that exist in your
          records are listed (A1, A2, B1, B2, C1, C2, etc.).
        </p>
      </div>

      {batchKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submitted records yet — nothing to export.</p>
      ) : (
        <>
          {hideBatchPicker ? (
            <p className="text-xs text-muted-foreground">
              Use the batch filters above, then export all records or only the selected batch(es).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Select batches to export:</span>
                {batchFilters.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={onClearBatchFilters}>
                    Clear selection
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {batchKeys.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onToggleBatch(label)}
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
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={exporting} onClick={onExportAll}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting…" : "Export all records"}
            </Button>
            <Button
              variant="secondary"
              disabled={exporting || batchFilters.length === 0}
              onClick={onExportSelectedBatches}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting
                ? "Exporting…"
                : batchFilters.length > 0
                  ? `Export batches: ${batchFilters.join(", ")}`
                  : "Export selected batches"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
