"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Download, FileText, Calendar, Users, CheckCircle, AlertCircle } from "lucide-react";
import { fetchUserMonthlyReport, exportUserMonthlyPdf } from "@/app/actions/reports";

export default function ClearancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      const { getSessionAction } = await import("@/app/actions/session");
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  const load = async () => {
    if (!session?.user?._id) return;
    
    setLoading(true);
    try {
      const res = await fetchUserMonthlyReport(
        session.user._id,
        year, 
        month
      );
      setData(res.data);
    } catch (e: any) {
      push({ variant: "error", title: "Failed to load clearance", description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?._id) {
      load();
    }
  }, [year, month, session?.user?._id]);

  const exportPdf = async () => {
    if (!session?.user?._id) return;
    
    setExporting(true);
    try {
      const html = await exportUserMonthlyPdf(
        session.user._id,
        year, 
        month
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
      push({ variant: "success", title: "PDF Generated", description: "Clearance certificate has been generated for printing." });
    } catch (e: any) {
      push({ variant: "error", title: "Export failed", description: e?.message });
    } finally {
      setExporting(false);
    }
  };

  // Calculate statistics
  const totalRecords = data?.length || 0;
  const totalAttendance = data?.reduce((sum, row) => sum + (row.count || 0), 0) || 0;
  const averageAttendance = totalRecords > 0 ? (totalAttendance / totalRecords).toFixed(2) : 0;

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  if (!session) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CDS Clearance Certificate</h1>
        <p className="text-muted-foreground">Download your monthly CDS attendance clearance certificate</p>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Select Month</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                min="2020"
                max="2030"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {monthNames[i]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={load} loading={loading} className="w-full md:w-auto">
            <Calendar className="w-4 h-4 mr-2" />
            Generate Clearance
          </Button>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Clearance Statistics</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
                <div className="text-sm text-blue-600">Total CDS Sessions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalAttendance}</div>
                <div className="text-sm text-green-600">Times Attended</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{averageAttendance}%</div>
                <div className="text-sm text-purple-600">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clearance Certificate Preview */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Clearance Certificate Preview</h3>
              </div>
              <Button onClick={exportPdf} loading={exporting} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">CDS ATTENDANCE CLEARANCE CERTIFICATE</h2>
                <p className="text-gray-600 mt-2">{monthNames[month - 1]} {year}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{session.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{session.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">State Code:</span>
                  <span>{session.user.state_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">CDS Group:</span>
                  <span>{session.user.cds_group?.name || "Not Assigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total CDS Sessions:</span>
                  <span>{totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Times Attended:</span>
                  <span>{totalAttendance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Attendance Rate:</span>
                  <span>{averageAttendance}%</span>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2">
                  {totalAttendance >= totalRecords ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span className={`font-medium ${
                    totalAttendance >= totalRecords ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {totalAttendance >= totalRecords 
                      ? 'CLEARED - Attendance requirement met' 
                      : 'PENDING - Attendance requirement not met (100% required)'
                    }
                  </span>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-500 mt-6">
                <p>This certificate is generated automatically by the CDS Attendance Management System</p>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Instructions</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Select the month and year for which you want to generate your clearance certificate</p>
          <p>• The certificate will show your attendance statistics for the selected month</p>
          <p>• You need 100% attendance to be cleared for the month</p>
          <p>• Download the PDF certificate for your records or submission</p>
          <p>• This certificate is automatically generated and can be verified by administrators</p>
        </CardContent>
      </Card>
    </div>
  );
}
