"use server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function fetchMonthlyReport(year: number, month: number, cdsGroupId?: string, userId?: string) {
  const res = await client.query(api.reports.monthlyReport, { 
    year, 
    month, 
    cdsGroupId: cdsGroupId as any,
    userId: userId as any 
  });
  return res;
}

export async function fetchUserMonthlyReport(year: number, month: number, userId: string) {
  const res = await client.query(api.reports.monthlyReport, { 
    year, 
    month, 
    userId: userId as any 
  });
  return res;
}

export async function exportMonthlyCsv(
  year: number, 
  month: number, 
  cdsGroupId?: string, 
  minAttendance?: number, 
  maxAttendance?: number,
  stateCode?: string
) {
  const res = await client.action(api.reports.exportCsv, { 
    year, 
    month, 
    cdsGroupId: cdsGroupId as any,
    minAttendance,
    maxAttendance,
    stateCode
  });
  return res.csv as string;
}

export async function exportMonthlyPdf(
  year: number, 
  month: number, 
  cdsGroupId?: string, 
  minAttendance?: number, 
  maxAttendance?: number,
  stateCode?: string
) {
  const res = await client.action(api.reports.exportPdf, { 
    year, 
    month, 
    cdsGroupId: cdsGroupId as any,
    minAttendance,
    maxAttendance,
    stateCode
  });
  return res.html as string;
}

export async function exportUserMonthlyPdf(
  userId: string,
  year: number, 
  month: number
) {
  const res = await client.action(api.reports.exportUserPdf, { 
    userId: userId as any,
    year, 
    month
  });
  return res.html as string;
}


