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

export async function exportMonthlyCsv(year: number, month: number, cdsGroupId?: string) {
  const res = await client.action(api.reports.exportCsv, { year, month, cdsGroupId: cdsGroupId as any });
  return res.csv as string;
}


