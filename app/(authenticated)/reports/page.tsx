"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { exportMonthlyCsv, fetchMonthlyReport } from "@/app/actions/reports";

export default function ReportsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchMonthlyReport(year, month);
      setData(res.data);
    } catch (e: any) {
      push({ variant: "error", title: "Failed to load report", description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = async () => {
    try {
      const csv = await exportMonthlyCsv(year, month);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, "0")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      push({ variant: "error", title: "Export failed", description: e?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Reports</h1>
        <p className="text-muted-foreground">Generate and export attendance reports</p>
      </div>
      <Card>
        <CardHeader>Filters</CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Year</label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Month</label>
            <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
          </div>
          <Button onClick={load} loading={loading}>Generate</Button>
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Results</CardHeader>
        <CardContent>
          {!data ? (
            <div className="text-sm text-gray-600">No data.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">State Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Attendance</th>
                    <th className="py-2">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-none">
                      <td className="py-2">{row.state_code}</td>
                      <td className="py-2">{row.name}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">{row.dates.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


