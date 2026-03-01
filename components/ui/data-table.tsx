"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./card";
import { Pagination } from "./pagination";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
  itemsPerPage?: number;
  selectable?: boolean;
  rowIdKey?: keyof T | ((item: T) => string);
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  toolbar?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  title,
  description,
  emptyMessage = "No data available",
  className,
  itemsPerPage = 80,
  selectable,
  rowIdKey = "_id" as keyof T,
  selectedIds = [],
  onSelectionChange,
  toolbar,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const getRowId = (item: T): string => {
    if (typeof rowIdKey === "function") return rowIdKey(item);
    return String(item[rowIdKey] ?? "");
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Reset to page 1 when data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, totalPages]);

  const selectedSet = new Set(selectedIds);
  const allPaginatedIds = paginatedData.map((item) => getRowId(item));
  const allPaginatedSelected = allPaginatedIds.every((id) => selectedSet.has(id));
  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allPaginatedSelected) {
      const next = selectedIds.filter((id) => !allPaginatedIds.includes(id));
      onSelectionChange(next);
    } else {
      const next = [...new Set([...selectedIds, ...allPaginatedIds])];
      onSelectionChange(next);
    }
  };

  return (
    <Card className={cn("", className)}>
      {(title || description || toolbar) && (
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {toolbar}
        </CardHeader>
      )}
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground px-4">
            {emptyMessage}
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {selectable && (
                    <th className="w-12 py-3 px-4">
                      <input
                        type="checkbox"
                        checked={allPaginatedSelected && allPaginatedIds.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={cn(
                        "text-left py-3 px-4 font-medium text-sm text-muted-foreground",
                        column.className
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                  {paginatedData.map((item, index) => {
                    const id = getRowId(item);
                    const rowKey = id || `row-${index}`;
                    return (
                  <tr key={rowKey} className={cn("border-b hover:bg-muted/50", selectedSet.has(id) && "bg-primary/5")}>
                    {selectable && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(id)}
                          onChange={() => {
                            if (!onSelectionChange) return;
                            const next = selectedSet.has(id)
                              ? selectedIds.filter((x) => x !== id)
                              : [...selectedIds, id];
                            onSelectionChange(next);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "py-3 px-4 text-sm",
                          column.className
                        )}
                      >
                        {column.render
                          ? column.render((item as any)[column.key], item)
                          : String((item as any)[column.key] || "-")}
                      </td>
                    ))}
                  </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={data.length}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
