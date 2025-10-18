import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    type: "positive" | "negative" | "neutral";
  };
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs",
            change.type === "positive" && "text-green-600",
            change.type === "negative" && "text-red-600",
            change.type === "neutral" && "text-muted-foreground"
          )}>
            {change.type === "positive" && "+"}
            {change.value}% {change.label}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
