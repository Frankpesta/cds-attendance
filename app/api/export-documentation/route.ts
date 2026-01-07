import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import ExcelJS from "exceljs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, type } = await request.json();

    if (!sessionToken || !type) {
      return NextResponse.json(
        { error: "Session token and type are required" },
        { status: 400 }
      );
    }

    // Verify session and check if user is admin or super_admin
    const session = await client.query(api.auth.getSession, { sessionToken });
    if (!session || (session.user.role !== "super_admin" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    let data: any[] = [];
    let headers: string[] = [];

    if (type === "corp_member") {
      const members = await client.query(api.documentation.listCorpMembers, { sessionToken });
      data = members || [];
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
      const employers = await client.query(api.documentation.listEmployers, { sessionToken });
      data = employers || [];
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
      const rejectedReposting = await client.query(api.documentation.listRejectedReposting, { sessionToken });
      data = rejectedReposting || [];
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
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'corp_member', 'employer', or 'rejected_reposting'" },
        { status: 400 }
      );
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheetName = type === "corp_member" ? "Corp Members" : type === "employer" ? "Employers" : "Rejected/Reposting";
    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF008751" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    data.forEach((item) => {
      if (type === "corp_member") {
        worksheet.addRow([
          item.full_name || "",
          item.state_code || "",
          item.phone_number || "",
          item.residential_address || "",
          item.next_of_kin || "",
          item.next_of_kin_phone || "",
          item.gender || "",
          item.ppa || "",
          item.course_of_study || "",
          item.call_up_number || "",
          item.email || "",
          item.nysc_account_number || "",
          item.bank_name || "",
          item.nin || "",
          item.cds || "",
          item.medical_history ? "Yes" : "No",
          item.personal_skill || "",
          item.saed_camp_skill || "",
          item.proposed_post_camp_saed_skill || "",
          item.selected_trainer_name || "",
          item.selected_trainer_business || "",
          item.selected_trainer_phone || "",
          item.selected_trainer_email || "",
          item.created_at ? new Date(item.created_at).toLocaleString() : "",
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
          item.created_at ? new Date(item.created_at).toLocaleString() : "",
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
          item.created_at ? new Date(item.created_at).toLocaleString() : "",
        ]);
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.header) {
        column.width = 20;
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = type === "corp_member" ? "corp-members" : type === "employer" ? "employers" : "rejected-reposting";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}-documentation-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting documentation:", error);
    return NextResponse.json(
      { error: "Failed to export documentation" },
      { status: 500 }
    );
  }
}
