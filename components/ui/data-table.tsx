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
}

export function DataTable<T>({
  data,
  columns,
  title,
  description,
  emptyMessage = "No data available",
  className,
  itemsPerPage = 80,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <Card className={cn("", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
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
                  {paginatedData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
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
                  ))}
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
