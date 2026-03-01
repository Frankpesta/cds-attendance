"use server";
import * as reportsRepo from "@/lib/repositories/reports";

export async function fetchMonthlyReport(
  year: number,
  month: number,
  cdsGroupId?: string,
  userId?: string,
) {
  return reportsRepo.monthlyReport({
    year,
    month,
    cdsGroupId,
    userId,
  });
}

export async function fetchUserMonthlyReport(
  year: number,
  month: number,
  userId: string,
) {
  return reportsRepo.monthlyReport({
    year,
    month,
    userId,
  });
}

export async function exportMonthlyCsv(
  year: number,
  month: number,
  cdsGroupId?: string,
  minAttendance?: number,
  maxAttendance?: number,
  stateCode?: string,
) {
  const csv = await reportsRepo.exportCsv({
    year,
    month,
    cdsGroupId,
    minAttendance,
    maxAttendance,
    stateCode,
  });
  return csv;
}

export async function exportMonthlyPdf(
  year: number,
  month: number,
  cdsGroupId?: string,
  minAttendance?: number,
  maxAttendance?: number,
  stateCode?: string,
) {
  const html = await reportsRepo.exportPdf({
    year,
    month,
    cdsGroupId,
    minAttendance,
    maxAttendance,
    stateCode,
  });
  return html;
}

export async function exportUserMonthlyPdf(
  userId: string,
  year: number,
  month: number,
  baseUrl?: string,
) {
  const html = await reportsRepo.exportUserPdf({
    userId,
    year,
    month,
    baseUrl: baseUrl || process.env.NEXT_PUBLIC_APP_URL || "",
  });
  return html;
}
