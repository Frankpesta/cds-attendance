"use client";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/ui/pagination";
import { exportMonthlyCsv, exportMonthlyPdf, fetchMonthlyReport } from "@/app/actions/reports";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { extractErrorMessage } from "@/lib/utils";
import { Download, FileText, Filter, BarChart3, Users, Calendar } from "lucide-react";

export default function ReportsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [selectedGroup, setSelectedGroup] = useState("");
  const [minAttendance, setMinAttendance] = useState("");
  const [maxAttendance, setMaxAttendance] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 80;
  
  const { push } = useToast();
  
  // Fetch CDS groups for filtering
  const cdsGroups = useQuery(api.cds_groups.list, {});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchMonthlyReport(
        year, 
        month, 
        selectedGroup || undefined
      );
      setData(res.data);
    } catch (e: any) {
      push({ variant: "error", title: "Failed to load report", description: extractErrorMessage(e, "Failed to load report") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year, month, selectedGroup]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await exportMonthlyCsv(
        year, 
        month, 
        selectedGroup || undefined,
        minAttendance ? Number(minAttendance) : undefined,
        maxAttendance ? Number(maxAttendance) : undefined,
        stateCode || undefined
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, "0")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      push({ variant: "success", title: "CSV Exported", description: "Report has been downloaded successfully." });
    } catch (e: any) {
      push({ variant: "error", title: "Export failed", description: extractErrorMessage(e, "Failed to export") });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const html = await exportMonthlyPdf(
        year, 
        month, 
        selectedGroup || undefined,
        minAttendance ? Number(minAttendance) : undefined,
        maxAttendance ? Number(maxAttendance) : undefined,
        stateCode || undefined
      );
      
      // Create a new window and print the HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
      push({ variant: "success", title: "PDF Generated", description: "Report has been generated for printing." });
    } catch (e: any) {
      push({ variant: "error", title: "Export failed", description: extractErrorMessage(e, "Failed to export") });
    } finally {
      setExporting(false);
    }
  };

  // Filter data based on attendance count
  const filteredData = useMemo(() => {
    return data?.filter((row) => {
      const count = row.count;
      const minCheck = !minAttendance || count >= Number(minAttendance);
      const maxCheck = !maxAttendance || count <= Number(maxAttendance);
      const stateCodeCheck = !stateCode || row.state_code.toLowerCase().includes(stateCode.toLowerCase());
      return minCheck && maxCheck && stateCodeCheck;
    }) || [];
  }, [data, minAttendance, maxAttendance, stateCode]);

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [minAttendance, maxAttendance, stateCode, data]);

  // Calculate statistics
  const totalRecords = filteredData.length;
  const totalAttendance = filteredData.reduce((sum, row) => sum + row.count, 0);
  const averageAttendance = totalRecords > 0 ? (totalAttendance / totalRecords).toFixed(2) : 0;

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Reports</h1>
        <p className="text-muted-foreground">Generate and export comprehensive attendance reports with advanced filtering</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Report Filters</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Select
                value={month.toString()}
                onChange={(e) => setMonth(Number(e.target.value))}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: monthNames[i]
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CDS Group</label>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={[
                  { value: "", label: "All Groups" },
                  ...(cdsGroups?.map((group: any) => ({
                    value: group._id,
                    label: group.name
                  })) || [])
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={load} loading={loading} className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Attendance Count Filters */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Attendance Count Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Attendance</label>
                <Input 
                  type="number" 
                  value={minAttendance}
                  onChange={(e) => setMinAttendance(e.target.value)}
                  placeholder="e.g., 5"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maximum Attendance</label>
                <Input 
                  type="number" 
                  value={maxAttendance}
                  onChange={(e) => setMaxAttendance(e.target.value)}
                  placeholder="e.g., 20"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State Code Filter</label>
                <Input 
                  type="text" 
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g., 25A, 25B, OD/25A"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Report Statistics</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
                <div className="text-sm text-gray-600">Total Members</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Calendar className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold text-green-600">{totalAttendance}</div>
                <div className="text-sm text-gray-600">Total Attendance</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <BarChart3 className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-purple-600">{averageAttendance}</div>
                <div className="text-sm text-gray-600">Average per Member</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Export Options</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                onClick={exportCsv} 
                loading={exporting}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </Button>
              <Button 
                onClick={exportPdf} 
                loading={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Exports will include {totalRecords} records with applied filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Report Results</h3>
          <p className="text-sm text-gray-600">
            {monthNames[month - 1]} {year} • {totalRecords} records
          </p>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="text-center py-8 text-gray-600">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No data available. Generate a report to see results.</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No records match the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 font-medium">State Code</th>
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">CDS Group</th>
                    <th className="py-2 font-medium">Attendance Count</th>
                    <th className="py-2 font-medium">Attendance Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    // Get group name from the groups data
                    const groupName = cdsGroups?.find((g: any) => g._id === row.cds_group_id)?.name || "Unknown Group";
                    
                    return (
                      <tr key={idx} className="border-b last:border-none hover:bg-gray-50">
                        <td className="py-2 font-mono text-sm">{row.state_code}</td>
                        <td className="py-2 font-medium">{row.name}</td>
                        <td className="py-2 text-gray-600">{groupName}</td>
                        <td className="py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.count >= 15 ? 'bg-green-100 text-green-800' :
                            row.count >= 10 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.count}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600 text-xs">
                          {row.dates.length > 0 ? row.dates.join(", ") : "No attendance"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredData.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredData.length}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


