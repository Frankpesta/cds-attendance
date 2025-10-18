import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
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
}

export function DataTable<T>({
  data,
  columns,
  title,
  description,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  return (
    <Card className={cn("", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
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
                {data.map((item, index) => (
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
                          ? column.render(item[column.key], item)
                          : String(item[column.key] || "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
