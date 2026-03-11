/**
 * Daily Report PDF built with React-PDF.
 *
 * Uses the same ReportPage layout, styles, and ReportTable component
 * as the time-tracking report for visual consistency.
 */

import React from "react";
import {
  Document,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { ReportPage } from "./report-layout";
import { ReportTable, type TableColumn, type TableRow } from "./report-table";
import { COLORS } from "./styles";
import type {
  DailyReport,
  Employee,
  Project,
  Equipment,
  TimeEntry,
  CostCode,
  Attachment,
  Tool,
  CompanyProfile,
} from "@/lib/types/time-tracking";

// ── Local styles ──

const s = StyleSheet.create({
  sectionHeader: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  sectionHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row" as const,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.rule,
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray,
    width: 100,
  },
  infoValue: {
    fontSize: 8,
    color: COLORS.text,
    flex: 1,
  },
  workDescBlock: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
    backgroundColor: COLORS.faintBg,
    borderRadius: 2,
  },
  workDescLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray,
    marginBottom: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  workDescText: {
    fontSize: 8,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  photosRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: COLORS.rule,
  },
  photoLabel: {
    fontSize: 6,
    color: COLORS.gray,
    textAlign: "center" as const,
    marginTop: 2,
    maxWidth: 72,
  },
  photoItem: {
    alignItems: "center" as const,
    marginRight: 6,
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: "row" as const,
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
  },
  totalLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    flex: 1,
    textAlign: "right" as const,
    paddingRight: 8,
  },
  totalValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    width: 50,
    textAlign: "right" as const,
  },
});

// ── Section header component ──

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// ── Info row (key-value pair) ──

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ── Options ──

export interface DailyReportPDFOptions {
  report: DailyReport;
  employees: Employee[];
  projects: Project[];
  equipment: Equipment[];
  timeEntries?: TimeEntry[];
  costCodes?: CostCode[];
  attachments?: Attachment[];
  tools?: Tool[];
  company?: CompanyProfile | null;
  /** Pre-resolved photo data URLs (keyed by original URL) */
  photoDataUrls?: Map<string, string>;
  /** Section IDs to include (undefined = all sections) */
  selectedSections?: string[];
  /** PDF page orientation */
  orientation?: "portrait" | "landscape";
  /** Custom report title override */
  title?: string;
}

/** All toggleable section definitions for daily report PDFs */
export const DAILY_REPORT_SECTIONS = [
  { id: "weather", header: "Weather Conditions" },
  { id: "workDescription", header: "Work Tasks" },
  { id: "staff", header: "On-Site Staff" },
  { id: "equipment", header: "On-Site Equipment" },
  { id: "timeEntries", header: "Time Entries" },
  { id: "photos", header: "Site Photos" },
] as const;

const ALL_SECTION_IDS = DAILY_REPORT_SECTIONS.map((s) => s.id);

// ── Document component ──

function DailyReportDocument({
  report,
  employees,
  projects,
  equipment,
  timeEntries = [],
  costCodes = [],
  attachments = [],
  tools = [],
  company,
  photoDataUrls,
  selectedSections,
  orientation = "portrait",
  title,
}: DailyReportPDFOptions) {
  const sections = new Set(selectedSections ?? ALL_SECTION_IDS);
  const project = projects.find((p) => p.id === report.projectId);
  const author = employees.find((e) => e.id === report.authorId);
  const w = report.weather;

  // Weather table
  const weatherColumns: TableColumn[] = [
    { key: "field", header: "Field", flex: 1 },
    { key: "value", header: "Value", flex: 2 },
  ];
  const weatherRows: TableRow[] = [
    { field: "Temperature", value: w.temperature || "—" },
    { field: "Conditions", value: w.conditions.join(", ") || "—" },
    { field: "Precipitation", value: w.precipitation || "—" },
    { field: "Ground Conditions", value: w.groundConditions || "—" },
  ];

  // On-Site Staff table
  const staffCols: TableColumn[] = [
    { key: "name", header: "Name", flex: 1.5 },
    { key: "role", header: "Role", flex: 1 },
  ];
  const staffRows: TableRow[] = (report.onSiteStaff ?? [])
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => ({
      name: e!.name,
      role: e!.role || "—",
    }));

  // On-Site Equipment table
  const equipCols: TableColumn[] = [
    { key: "name", header: "Equipment", flex: 1.5 },
    { key: "number", header: "Unit #", flex: 0.6 },
    { key: "category", header: "Category", flex: 1 },
  ];
  const equipRows: TableRow[] = (report.onSiteEquipment ?? [])
    .map((id) => equipment.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => ({
      name: e!.name,
      number: e!.number || "—",
      category: e!.category || "—",
    }));

  // Time entries matched by project + date
  const matchedEntries = timeEntries.filter(
    (te) => te.projectId === report.projectId && te.date === report.date
  );
  const timeEntryCols: TableColumn[] = [
    { key: "employee", header: "Employee", flex: 1.2 },
    { key: "costCode", header: "Cost Code", flex: 1.2 },
    { key: "equipment", header: "Equipment", flex: 1 },
    { key: "attachment", header: "Attachment", flex: 0.8 },
    { key: "tool", header: "Tool", flex: 0.8 },
    { key: "workType", header: "Type", flex: 0.5 },
    { key: "hours", header: "Hours", flex: 0.5, align: "right" },
    { key: "notes", header: "Notes", flex: 1.5 },
  ];
  const timeEntryRows: TableRow[] = matchedEntries.map((te) => {
    const emp = employees.find((e) => e.id === te.employeeId);
    const cc = costCodes.find((c) => c.id === te.costCodeId);
    const eq = te.equipmentId ? equipment.find((e) => e.id === te.equipmentId) : null;
    const att = te.attachmentId ? attachments.find((a) => a.id === te.attachmentId) : null;
    const tl = te.toolId ? tools.find((t) => t.id === te.toolId) : null;
    return {
      employee: emp?.name ?? "—",
      costCode: cc?.description ?? "—",
      equipment: eq?.name ?? "—",
      attachment: att?.name ?? "—",
      tool: tl?.name ?? "—",
      workType: te.workType === "tm" ? "T&M" : "LS",
      hours: String(te.hours),
      notes: te.notes || "",
    };
  });
  const totalHours = matchedEntries.reduce((sum, te) => sum + (te.hours || 0), 0);

  // Photos
  const morningPhotos = report.morningPhotoUrls ?? [];
  const workPhotos = report.workPhotoUrls ?? [];
  const eodPhotos = report.endOfDayPhotoUrls ?? [];
  const allPhotoGroups = [
    { label: "Morning", urls: morningPhotos },
    { label: "Work", urls: workPhotos },
    { label: "End of Day", urls: eodPhotos },
  ].filter((g) => g.urls.length > 0);

  return (
    <Document>
      <ReportPage
        company={company}
        title={title || `Daily Report #${report.reportNumber}`}
        orientation={orientation}
      >
        {/* ── Report Info ── */}
        <View>
          <InfoRow label="Project" value={project?.name || report.projectId} />
          <InfoRow label="Author" value={author?.name || report.authorId} />
          <InfoRow label="Date" value={report.date} />
          <InfoRow label="Time" value={report.time || "—"} />
        </View>

        {/* ── Work Tasks ── */}
        {sections.has("workDescription") && report.workDescription && (
          <View style={s.workDescBlock}>
            <Text style={s.workDescLabel}>Work Tasks</Text>
            {report.workDescription.split("\n").filter((l) => l.trim()).map((task, i) => (
              <Text key={i} style={s.workDescText}>{i + 1}. {task}</Text>
            ))}
          </View>
        )}

        {/* ── 1. Weather ── */}
        {sections.has("weather") && (
          <>
            <SectionHeader title="Weather Conditions" />
            <ReportTable columns={weatherColumns} rows={weatherRows} />
          </>
        )}

        {/* ── 2. On-Site Staff ── */}
        {sections.has("staff") && staffRows.length > 0 && (
          <>
            <SectionHeader title={`On-Site Staff (${staffRows.length})`} />
            <ReportTable columns={staffCols} rows={staffRows} />
          </>
        )}

        {/* ── 3. On-Site Equipment ── */}
        {sections.has("equipment") && equipRows.length > 0 && (
          <>
            <SectionHeader title={`On-Site Equipment (${equipRows.length})`} />
            <ReportTable columns={equipCols} rows={equipRows} />
          </>
        )}

        {/* ── 4. Time Entries ── */}
        {sections.has("timeEntries") && timeEntryRows.length > 0 && (
          <>
            <SectionHeader title={`Time Entries (${timeEntryRows.length})`} />
            <ReportTable columns={timeEntryCols} rows={timeEntryRows} />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Hours</Text>
              <Text style={s.totalValue}>{totalHours}h</Text>
            </View>
          </>
        )}

        {/* ── 5. Photos ── */}
        {sections.has("photos") && allPhotoGroups.length > 0 && (
          <>
            <SectionHeader title="Site Photos" />
            {allPhotoGroups.map((group) => (
              <View key={group.label} wrap={false}>
                <Text
                  style={{
                    fontSize: 7,
                    fontFamily: "Helvetica-Bold",
                    color: COLORS.gray,
                    paddingHorizontal: 8,
                    paddingTop: 6,
                    paddingBottom: 2,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {group.label} ({group.urls.length})
                </Text>
                <View style={s.photosRow}>
                  {group.urls.map((url, i) => {
                    const resolved = photoDataUrls?.get(url);
                    // Use pre-fetched data URL if available, otherwise
                    // point react-pdf at our server-side proxy so it
                    // can fetch the image without CORS issues.
                    const imgSrc = resolved
                      || `${window.location.origin}/api/logo?url=${encodeURIComponent(url)}`;
                    return (
                      <Link key={i} src={url} style={{ textDecoration: "none" }}>
                        <View style={s.photoItem}>
                          <Image
                            src={imgSrc}
                            style={s.photoThumb}
                          />
                          <Text style={{
                            fontSize: 6,
                            color: COLORS.gray,
                            textAlign: "center" as const,
                            marginTop: 2,
                          }}>
                            {group.label} #{i + 1}
                          </Text>
                        </View>
                      </Link>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ReportPage>
    </Document>
  );
}

// ── Logo helper (same as time-tracking) ──

async function fetchLogoAsDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/logo?url=${encodeURIComponent(logoUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function resolveCompanyLogo(
  opts: DailyReportPDFOptions
): Promise<DailyReportPDFOptions> {
  const logoUrl = opts.company?.pdfLogoUrl || opts.company?.logoUrl;
  if (!logoUrl) return opts;
  const dataUrl = await fetchLogoAsDataUrl(logoUrl);
  if (!dataUrl) return opts;
  return {
    ...opts,
    company: {
      ...opts.company!,
      pdfLogoUrl: dataUrl,
    },
  };
}

// ── Public API ──

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/logo?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size === 0) return null;

    // Resize to a small PNG thumbnail via canvas —
    // react-pdf's JPEG parser chokes on large/complex JPEGs,
    // but handles small PNG data URLs perfectly.
    const bmp = await createImageBitmap(blob);
    const size = 144; // 2× the 72pt display size for sharpness
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const scale = Math.max(size / bmp.width, size / bmp.height);
    const w = bmp.width * scale;
    const h = bmp.height * scale;
    ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
    bmp.close();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function resolvePhotos(
  report: DailyReport
): Promise<Map<string, string>> {
  const allUrls = [
    ...(report.morningPhotoUrls ?? []),
    ...(report.workPhotoUrls ?? []),
    ...(report.endOfDayPhotoUrls ?? []),
  ];
  if (allUrls.length === 0) return new Map();
  const results = await Promise.all(
    allUrls.map(async (url) => {
      const dataUrl = await fetchImageAsDataUrl(url);
      if (!dataUrl) console.warn("[daily-report-pdf] Failed to fetch photo:", url);
      return [url, dataUrl] as const;
    })
  );
  const map = new Map<string, string>();
  for (const [url, dataUrl] of results) {
    if (dataUrl) map.set(url, dataUrl);
  }
  return map;
}

export async function generateDailyReportPDF(
  opts: DailyReportPDFOptions
): Promise<void> {
  const includePhotos = !opts.selectedSections || opts.selectedSections.includes("photos");
  const [resolved, photoDataUrls] = await Promise.all([
    resolveCompanyLogo(opts),
    includePhotos ? resolvePhotos(opts.report) : Promise.resolve(new Map<string, string>()),
  ]);
  const blob = await pdf(
    <DailyReportDocument {...resolved} photoDataUrls={photoDataUrls} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-report-${opts.report.reportNumber}-${opts.report.date}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateDailyReportPDFBlobUrl(
  opts: DailyReportPDFOptions
): Promise<string> {
  const includePhotos = !opts.selectedSections || opts.selectedSections.includes("photos");
  const [resolved, photoDataUrls] = await Promise.all([
    resolveCompanyLogo(opts),
    includePhotos ? resolvePhotos(opts.report) : Promise.resolve(new Map<string, string>()),
  ]);
  const blob = await pdf(
    <DailyReportDocument {...resolved} photoDataUrls={photoDataUrls} />
  ).toBlob();
  return URL.createObjectURL(blob);
}
