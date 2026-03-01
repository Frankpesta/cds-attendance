import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as authRepo from "@/lib/repositories/auth";
import * as docRepo from "@/lib/repositories/documentation";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let sessionToken = body.sessionToken;
    const type = body.type;

    if (!sessionToken) {
      const c = await cookies();
      sessionToken = c.get("session_token")?.value || "";
    }

    if (!sessionToken || !type) {
      return NextResponse.json(
        { error: "Session token and type are required" },
        { status: 400 },
      );
    }

    const sessionResult = await authRepo.getSession(sessionToken);
    if (
      !sessionResult ||
      (sessionResult.user.role !== "super_admin" &&
        sessionResult.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    let data: unknown[] = [];
    let headers: string[] = [];

    if (type === "corp_member") {
      data = (await docRepo.listCorpMembers(sessionToken)) || [];
      headers = [
        "Full Name",
        "State Code",
        "Phone Number",
        "Residential Address",
        "Next of Kin",
        "Next of Kin Phone",
        "Gender",
        "PPA",
        "Course of Study",
        "Call Up Number",
        "Email",
        "NYSC Account Number",
        "Bank Name",
        "NIN",
        "CDS",
        "Medical History",
        "Personal Skill",
        "SAED Camp Skill",
        "Proposed Post Camp SAED Skill",
        "Selected Trainer Name",
        "Selected Trainer Business",
        "Selected Trainer Phone",
        "Selected Trainer Email",
        "Created At",
      ];
    } else if (type === "employer") {
      data = (await docRepo.listEmployers(sessionToken)) || [];
      headers = [
        "Organization Name",
        "Organization Address",
        "Organization Phone",
        "Contact Person Name",
        "Contact Person Phone",
        "CMS Required Per Year",
        "Accommodation",
        "Accommodation Type",
        "Monthly Stipend",
        "Email",
        "Nearest Landmark",
        "Created At",
      ];
    } else if (type === "rejected_reposting") {
      data = (await docRepo.listRejectedReposting(sessionToken)) || [];
      headers = [
        "Name",
        "State Code",
        "Sex",
        "Discipline",
        "Previous PPA",
        "New PPA",
        "Recommendation",
        "Created At",
      ];
    } else if (type === "corp_member_request") {
      data = (await docRepo.listCorpMemberRequests(sessionToken)) || [];
      headers = [
        "PPA Name",
        "PPA Address",
        "PPA Phone Number",
        "Number of Corp Members Requested",
        "Discipline Needed",
        "Gender Needed",
        "Monthly Stipend",
        "Available Accommodation",
        "Created At",
      ];
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid type. Must be 'corp_member', 'employer', 'rejected_reposting', or 'corp_member_request'",
        },
        { status: 400 },
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName =
      type === "corp_member"
        ? "Corp Members"
        : type === "employer"
          ? "Employers"
          : type === "rejected_reposting"
            ? "Rejected Reposting"
            : "Corp Member Requests";
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF008751" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    const items = data as Record<string, unknown>[];
    items.forEach((item) => {
      if (type === "corp_member") {
        worksheet.addRow([
          item.full_name ?? "",
          item.state_code ?? "",
          item.phone_number ?? "",
          item.residential_address ?? "",
          item.next_of_kin ?? "",
          item.next_of_kin_phone ?? "",
          item.gender ?? "",
          item.ppa ?? "",
          item.course_of_study ?? "",
          item.call_up_number ?? "",
          item.email ?? "",
          item.nysc_account_number ?? "",
          item.bank_name ?? "",
          item.nin ?? "",
          item.cds ?? "",
          item.medical_history ? "Yes" : "No",
          String(item.personal_skill ?? ""),
          String(item.saed_camp_skill ?? ""),
          String(item.proposed_post_camp_saed_skill ?? ""),
          String(item.selected_trainer_name ?? ""),
          String(item.selected_trainer_business ?? ""),
          String(item.selected_trainer_phone ?? ""),
          String(item.selected_trainer_email ?? ""),
          item.created_at
            ? new Date(Number(item.created_at)).toLocaleString()
            : "",
        ]);
      } else if (type === "employer") {
        worksheet.addRow([
          item.organization_name || "",
          item.organization_address || "",
          item.organization_phone || "",
          item.contact_person_name || "",
          item.contact_person_phone || "",
          item.cms_required_per_year || 0,
          item.accommodation ? "Yes" : "No",
          item.accommodation_type || "",
          item.monthly_stipend || 0,
          item.email || "",
          item.nearest_landmark || "",
          item.created_at
            ? new Date(Number(item.created_at)).toLocaleString()
            : "",
        ]);
      } else if (type === "rejected_reposting") {
        worksheet.addRow([
          item.name || "",
          item.state_code || "",
          item.sex || "",
          item.discipline || "",
          item.previous_ppa || "",
          item.new_ppa || "",
          item.recommendation || "",
          item.created_at
            ? new Date(Number(item.created_at)).toLocaleString()
            : "",
        ]);
      } else if (type === "corp_member_request") {
        worksheet.addRow([
          item.ppa_name || "",
          item.ppa_address || "",
          item.ppa_phone_number || "",
          item.number_of_corp_members_requested || 0,
          item.discipline_needed || "",
          item.gender_needed || "",
          item.monthly_stipend || 0,
          item.available_accommodation ? "Yes" : "No",
          item.created_at
            ? new Date(Number(item.created_at)).toLocaleString()
            : "",
        ]);
      }
    });

    worksheet.columns.forEach((column) => {
      if (column.header) {
        column.width = 20;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const filename =
      type === "corp_member"
        ? "corp-members"
        : type === "employer"
          ? "employers"
          : type === "rejected_reposting"
            ? "rejected-reposting"
            : "corp-member-requests";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}-documentation-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting documentation:", error);
    return NextResponse.json(
      { error: "Failed to export documentation" },
      { status: 500 },
    );
  }
}
