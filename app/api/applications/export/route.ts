import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { fetchApplications } from "@/lib/applications-query";
import { searchParamsSchema } from "@/lib/schemas";
import { ROLES } from "@/lib/roles";

// the list endpoint caps `limit` at 100 for the table view. the export needs
// every row that matches the active filters, so it reuses the same query with
// a much higher page size.
const exportParamsSchema = searchParamsSchema.extend({
    limit: z.coerce.number().int().min(1).max(10_000).default(10_000),
});

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function firstRecord(value: unknown): Row | null {
    if (Array.isArray(value)) return asRecord(value[0]);
    return asRecord(value);
}

function text(value: unknown): string {
    return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function applicant(app: Row): Row | null {
    return firstRecord(app.user);
}

function schoolName(app: Row): string {
    const formData = asRecord(app.form_data) || {};
    for (const key of ["school", "schoolName", "school_name", "schoolOrOrganization", "school_or_organization", "manual_school_name"]) {
        const value = formData[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    const details = firstRecord(applicant(app)?.user_details);
    return text(firstRecord(details?.high_schools)?.school_name)
        || text(details?.school)
        || text(asRecord(details?.additional_info)?.manual_school_name);
}

function committeeName(app: Row): string {
    const members = applicant(app)?.committee_members;
    if (!Array.isArray(members)) return "";
    for (const member of members) {
        const name = text(firstRecord(asRecord(member)?.committee)?.name);
        if (name) return name;
    }
    return "";
}

function statusLabel(status: string): string {
    return status ? status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "";
}

function isoDate(value: unknown): string {
    const date = new Date(text(value));
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function snapshotQuestions(app: Row): Array<{ id: string; label: string }> {
    const questions = asRecord(app.form_snapshot)?.questions;
    if (!Array.isArray(questions)) return [];
    return questions.flatMap((question) => {
        const record = asRecord(question);
        const id = text(record?.id);
        return id ? [{ id, label: text(record?.label) || id }] : [];
    });
}

function answerValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(answerValue).filter(Boolean).join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return "";
}

// spreadsheetml 2003 is the one excel-readable workbook format that does not
// need a zip/xlsx dependency. excel opens the .xls file natively.
const XML_INVALID_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function escapeXml(value: string): string {
    return value
        .replace(XML_INVALID_CHARS, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function cell(value: string, style: "sHeader" | "sBody"): string {
    // excel refuses string cells longer than 32,767 characters.
    return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value.slice(0, 32_000))}</Data></Cell>`;
}

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
    if (!auth.ok) throw new Error("Unauthorized");

    const { searchParams } = new URL(request.url);
    const params = exportParamsSchema.parse(Object.fromEntries(searchParams));
    const { data } = await fetchApplications({ ...params, page: 1 }, { includeFormSnapshot: true });

    const rows = (data || []) as unknown as Row[];

    const questionColumns = new Map<string, string>();
    const dataKeys = new Set<string>();
    for (const app of rows) {
        for (const question of snapshotQuestions(app)) {
            if (!questionColumns.has(question.id)) questionColumns.set(question.id, question.label);
        }
        const formData = asRecord(app.form_data);
        if (formData) {
            for (const key of Object.keys(formData)) dataKeys.add(key);
        }
    }
    // legacy rows can predate form snapshots; keep their raw field ids so no
    // answer is dropped from the export.
    for (const key of dataKeys) {
        if (!questionColumns.has(key)) questionColumns.set(key, key);
    }
    const answerColumns = Array.from(questionColumns, ([id, label]) => ({ id, label }));

    const baseColumns = ["Applicant", "Email", "Phone", "Role", "School", "City", "Grade", "Submitted", "Committee", "Status", "Payment status", "Review notes"];
    const baseWidths = [140, 180, 90, 120, 160, 80, 60, 70, 130, 80, 90, 180];
    const columns = [...baseColumns, ...answerColumns.map((column) => column.label)];
    const widths = [...baseWidths, ...answerColumns.map(() => 180)];

    const headerXml = `<Row ss:Height="20">${columns.map((column) => cell(column, "sHeader")).join("")}</Row>`;
    const bodyXml = rows.map((app) => {
        const user = applicant(app);
        const details = firstRecord(user?.user_details);
        const form = firstRecord(app.form);
        const formData = asRecord(app.form_data) || {};
        const values = [
            text(user?.full_name),
            text(user?.email),
            text(details?.phone_number),
            text(form?.title) || text(form?.slug) || text(app.application_type),
            schoolName(app),
            text(details?.city),
            text(details?.grade),
            isoDate(app.submitted_at),
            committeeName(app),
            statusLabel(text(app.status)),
            statusLabel(text(app.payment_status)),
            text(app.review_notes),
            ...answerColumns.map((column) => answerValue(formData[column.id])),
        ];
        return `<Row>${values.map((value) => cell(value, "sBody")).join("")}</Row>`;
    }).join("");

    const columnXml = widths.map((width) => `<Column ss:Width="${width}"/>`).join("\n   ");

    const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4C1D95" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="sBody">
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Applications">
  <Table>
   ${columnXml}
   ${headerXml}
   ${bodyXml}
  </Table>
 </Worksheet>
</Workbook>`;

    const filename = `applications-${new Date().toISOString().slice(0, 10)}.xls`;

    return new NextResponse(workbook, {
        headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
});
