import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

interface ChartProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Chart({ title, description, children, className }: ChartProps) {
  return (
    <Card className={cn("", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}

export function BarChart({ data, className }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                item.color || "bg-primary"
              )}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  className?: string;
}

export function PieChart({ data, className }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = cumulativePercentage * 3.6;
              const endAngle = (cumulativePercentage + percentage) * 3.6;
              cumulativePercentage += percentage;

              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              const largeArcFlag = percentage > 50 ? 1 : 0;

              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`,
              ].join(" ");

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  className="transition-all duration-300 hover:opacity-80"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
            <span className="ml-auto font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
