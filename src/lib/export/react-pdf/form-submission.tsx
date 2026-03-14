/**
 * Form Submission PDF built with React-PDF.
 *
 * Renders a filled-out custom form as a professional PDF
 * matching the invoice-style layout used by other reports.
 */

import React from "react";
import {
  Document,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { ReportPage } from "./report-layout";
import { COLORS } from "./styles";
import type {
  FormSection,
  FormField,
  FormFieldOptionsSource,
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
  repeatableBadge: {
    fontSize: 6.5,
    color: "#cccccc",
    marginLeft: 6,
  },
  entryHeader: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 1,
  },
  entryHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  fieldRow: {
    flexDirection: "row" as const,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.rule,
  },
  fieldLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray,
    width: 140,
  },
  fieldValue: {
    fontSize: 8,
    color: COLORS.text,
    flex: 1,
  },
  halfRow: {
    flexDirection: "row" as const,
    paddingHorizontal: 8,
  },
  halfField: {
    flex: 1,
    flexDirection: "row" as const,
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.rule,
  },
  halfLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray,
    width: 100,
  },
  halfValue: {
    fontSize: 8,
    color: COLORS.text,
    flex: 1,
  },
  sectionHeaderLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  infoLabel: {
    fontSize: 7,
    color: COLORS.gray,
    paddingHorizontal: 8,
    paddingBottom: 4,
    lineHeight: 1.4,
  },
  toggleYes: {
    fontSize: 8,
    color: "#16a34a",
    fontFamily: "Helvetica-Bold",
  },
  toggleNo: {
    fontSize: 8,
    color: COLORS.gray,
  },
  signatureBlock: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  signatureLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.black,
    height: 40,
    width: 200,
    marginBottom: 4,
  },
  signatureImage: {
    width: 180,
    height: 60,
    objectFit: "contain" as const,
    marginBottom: 4,
  },
  photoRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: COLORS.rule,
  },
});

// ── Options ──

export interface FormSubmissionPDFOptions {
  /** Form name / title */
  name: string;
  /** Form description */
  description?: string;
  /** Template sections with field definitions */
  sections: FormSection[];
  /** Submitted field values (fieldId → value) */
  values: Record<string, unknown>;
  /** Whether a signature was required */
  requireSignature?: boolean;
  /** Signature image data URL */
  signatureDataUrl?: string;
  /** Company profile for header */
  company?: CompanyProfile | null;
  /** Lookup map: optionsSource → (id → label) for resolving IDs */
  sourceLabelMap?: Record<string, Record<string, string>>;
  /** Pre-resolved photo data URLs (keyed by original URL) */
  photoDataUrls?: Map<string, string>;
  /** Selected project name */
  projectName?: string;
  /** Selected project address */
  projectAddress?: string;
  /** Selected equipment name */
  equipmentName?: string;
}

// ── Helpers ──

function resolveValue(
  field: FormField,
  raw: unknown,
  sourceLabelMap?: Record<string, Record<string, string>>,
): string {
  if (raw === undefined || raw === null || raw === "") return "—";

  // Toggle / boolean
  if (field.type === "toggle") {
    return raw === true || raw === "true" ? "Yes" : "No";
  }

  // Array values (multiselect, checkbox)
  if (Array.isArray(raw)) {
    const labels = raw.map((v) => {
      const str = String(v);
      if (field.optionsSource && sourceLabelMap?.[field.optionsSource]?.[str]) {
        return sourceLabelMap[field.optionsSource][str];
      }
      const opt = field.options?.find((o) => o.value === str);
      return opt?.label || str;
    });
    return labels.join(", ") || "—";
  }

  // Object values (e.g. weather: {conditions, temperature, …})
  if (typeof raw === "object" && raw !== null) {
    const entries = Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v)));
    return entries.join(" · ") || "—";
  }

  const str = String(raw);

  // Data source resolution
  if (field.optionsSource && sourceLabelMap?.[field.optionsSource]?.[str]) {
    return sourceLabelMap[field.optionsSource][str];
  }

  // Option label resolution
  if (field.options?.length) {
    const opt = field.options.find((o) => o.value === str);
    if (opt?.label) return opt.label;
  }

  return str;
}

/** Group consecutive half-width fields into pairs for side-by-side rendering */
function groupFields(fields: FormField[]): (FormField | [FormField, FormField])[] {
  const result: (FormField | [FormField, FormField])[] = [];
  let i = 0;
  while (i < fields.length) {
    const field = fields[i];
    if (
      field.width === "half" &&
      i + 1 < fields.length &&
      fields[i + 1].width === "half"
    ) {
      result.push([field, fields[i + 1]]);
      i += 2;
    } else {
      result.push(field);
      i++;
    }
  }
  return result;
}

// ── Document component ──

function FormSubmissionDocument({
  name,
  description,
  sections,
  values,
  requireSignature,
  signatureDataUrl,
  company,
  sourceLabelMap,
  photoDataUrls,
  projectName,
  projectAddress,
  equipmentName,
}: FormSubmissionPDFOptions) {

  /** Render a single field row */
  const renderField = (field: FormField) => {
    if (field.type === "section-header") {
      return (
        <Text key={field.id} style={s.sectionHeaderLabel}>
          {field.label}
        </Text>
      );
    }
    if (field.type === "label") {
      return (
        <Text key={field.id} style={s.infoLabel}>
          {field.label}
        </Text>
      );
    }
    if (field.type === "photo") {
      const urls = values[field.id];
      const photoList = Array.isArray(urls) ? urls : [];
      if (photoList.length === 0) {
        return (
          <View key={field.id} style={s.fieldRow}>
            <Text style={s.fieldLabel}>{field.label || "Photos"}</Text>
            <Text style={s.fieldValue}>—</Text>
          </View>
        );
      }
      return (
        <View key={field.id}>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{field.label || "Photos"}</Text>
            <Text style={s.fieldValue}>{photoList.length} photo(s)</Text>
          </View>
          <View style={s.photoRow}>
            {photoList.map((url: string, i: number) => {
              const resolved = photoDataUrls?.get(url);
              const imgSrc = resolved
                || `${typeof window !== "undefined" ? window.location.origin : ""}/api/logo?url=${encodeURIComponent(url)}`;
              return (
                <Image key={i} src={imgSrc} style={s.photoThumb} />
              );
            })}
          </View>
        </View>
      );
    }
    if (field.type === "signature") {
      const sigUrl = values[field.id] as string | undefined;
      const resolved = sigUrl ? (photoDataUrls?.get(sigUrl) || sigUrl) : null;
      return (
        <View key={field.id} style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{field.label || "Signature"}</Text>
          {resolved ? (
            <Image src={resolved} style={s.signatureImage} />
          ) : (
            <View style={s.signatureLine} />
          )}
        </View>
      );
    }

    if (field.type === "checkbox" && field.options?.length) {
      const selected = Array.isArray(values[field.id]) ? (values[field.id] as string[]) : [];
      return (
        <View key={field.id}>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{field.label || "(No label)"}</Text>
            <Text style={s.fieldValue}> </Text>
          </View>
          {field.options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <View key={opt.value} style={[s.fieldRow, { paddingLeft: 20 }]}>
                <Text style={[s.fieldValue, { fontSize: 8 }]}>
                  {checked ? "☑" : "☐"}  {opt.label || opt.value}
                </Text>
              </View>
            );
          })}
        </View>
      );
    }

    const raw = values[field.id];
    const display = resolveValue(field, raw, sourceLabelMap);

    return (
      <View key={field.id} style={s.fieldRow}>
        <Text style={s.fieldLabel}>
          {field.label || "(No label)"}
        </Text>
        {field.type === "toggle" ? (
          <Text style={raw === true || raw === "true" ? s.toggleYes : s.toggleNo}>
            {display}
          </Text>
        ) : (
          <Text style={s.fieldValue}>{display}</Text>
        )}
      </View>
    );
  };

  /** Render half-width field pair */
  const renderHalfPair = (pair: [FormField, FormField]) => {
    const [a, b] = pair;
    const rawA = values[a.id];
    const rawB = values[b.id];
    return (
      <View key={`${a.id}-${b.id}`} style={s.halfRow}>
        <View style={s.halfField}>
          <Text style={s.halfLabel}>{a.label || "(No label)"}</Text>
          <Text style={s.halfValue}>{resolveValue(a, rawA, sourceLabelMap)}</Text>
        </View>
        <View style={[s.halfField, { marginLeft: 8 }]}>
          <Text style={s.halfLabel}>{b.label || "(No label)"}</Text>
          <Text style={s.halfValue}>{resolveValue(b, rawB, sourceLabelMap)}</Text>
        </View>
      </View>
    );
  };

  /** Render fields for a section (or an entry within a repeatable section) */
  const renderFields = (fields: FormField[]) => {
    const grouped = groupFields(fields);
    return grouped.map((item) =>
      Array.isArray(item) ? renderHalfPair(item) : renderField(item)
    );
  };

  /** Render a repeatable section with its entries */
  const renderRepeatableSection = (section: FormSection) => {
    const entriesRaw = values[`__repeatable_${section.id}`];
    const entries = Array.isArray(entriesRaw) ? entriesRaw as Record<string, unknown>[] : [];

    if (entries.length === 0) {
      return (
        <View key={section.id} style={s.fieldRow}>
          <Text style={s.fieldValue}>No entries</Text>
        </View>
      );
    }

    return entries.map((entry, idx) => (
      <View key={`${section.id}-${idx}`}>
        <View style={s.entryHeader}>
          <Text style={s.entryHeaderText}>#{idx + 1}</Text>
        </View>
        {section.fields
          .filter((f) => !["section-header", "label"].includes(f.type))
          .map((field) => {
            const raw = entry[field.id];

            // Signature field → render as image
            if (field.type === "signature") {
              const sigUrl = raw as string | undefined;
              const resolved = sigUrl ? (photoDataUrls?.get(sigUrl) || sigUrl) : null;
              return (
                <View key={field.id} style={s.signatureBlock}>
                  <Text style={s.signatureLabel}>{field.label || "Signature"}</Text>
                  {resolved ? (
                    <Image src={resolved} style={s.signatureImage} />
                  ) : (
                    <View style={s.signatureLine} />
                  )}
                </View>
              );
            }

            // Photo field → render thumbnails
            if (field.type === "photo" && Array.isArray(raw) && raw.length > 0) {
              return (
                <View key={field.id} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{field.label || "(No label)"}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {(raw as string[]).map((url, i) => {
                      const imgSrc = photoDataUrls?.get(url) || url;
                      return <Image key={i} src={imgSrc} style={s.photoThumb} />;
                    })}
                  </View>
                </View>
              );
            }

            // Checkbox field → show each option checked/unchecked
            if (field.type === "checkbox" && field.options?.length) {
              const selected = Array.isArray(raw) ? (raw as string[]) : [];
              return (
                <View key={field.id}>
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{field.label || "(No label)"}</Text>
                    <Text style={s.fieldValue}> </Text>
                  </View>
                  {field.options.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                      <View key={opt.value} style={[s.fieldRow, { paddingLeft: 20 }]}>
                        <Text style={[s.fieldValue, { fontSize: 8 }]}>
                          {checked ? "☑" : "☐"}  {opt.label || opt.value}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            }

            const display = resolveValue(field, raw, sourceLabelMap);
            return (
              <View key={field.id} style={s.fieldRow}>
                <Text style={s.fieldLabel}>{field.label || "(No label)"}</Text>
                {field.type === "toggle" ? (
                  <Text style={raw === true || raw === "true" ? s.toggleYes : s.toggleNo}>
                    {display}
                  </Text>
                ) : (
                  <Text style={s.fieldValue}>{display}</Text>
                )}
              </View>
            );
          })}
      </View>
    ));
  };

  return (
    <Document>
      <ReportPage
        company={company}
        title={name || "Form Submission"}
        orientation="portrait"
      >
        {/* ── Description ── */}
        {description && (
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Description</Text>
            <Text style={s.fieldValue}>{description}</Text>
          </View>
        )}

        {/* ── Project ── */}
        {projectName && (
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Project</Text>
            <Text style={s.fieldValue}>
              {projectName}{projectAddress ? `  —  ${projectAddress}` : ""}
            </Text>
          </View>
        )}

        {/* ── Equipment ── */}
        {equipmentName && (
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Equipment</Text>
            <Text style={s.fieldValue}>{equipmentName}</Text>
          </View>
        )}

        {/* ── Form sections ── */}
        {sections.map((section) => (
          <View key={section.id}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>
                {section.title || "Section"}
              </Text>
            </View>

            {section.repeatable
              ? renderRepeatableSection(section)
              : renderFields(section.fields)}
          </View>
        ))}

        {/* ── Signature ── */}
        {requireSignature && (
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>Signature</Text>
            {signatureDataUrl ? (
              <Image src={signatureDataUrl} style={s.signatureImage} />
            ) : (
              <View style={s.signatureLine} />
            )}
          </View>
        )}
      </ReportPage>
    </Document>
  );
}

// ── Logo helper ──

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
  opts: FormSubmissionPDFOptions,
): Promise<FormSubmissionPDFOptions> {
  const logoUrl = opts.company?.pdfLogoUrl || opts.company?.logoUrl;
  if (!logoUrl) return opts;
  const dataUrl = await fetchLogoAsDataUrl(logoUrl);
  if (!dataUrl) return opts;
  return {
    ...opts,
    company: { ...opts.company!, pdfLogoUrl: dataUrl },
  };
}

// ── Public API ──

export async function generateFormSubmissionPDF(
  opts: FormSubmissionPDFOptions,
): Promise<void> {
  const resolved = await resolveCompanyLogo(opts);
  const blob = await pdf(<FormSubmissionDocument {...resolved} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (opts.name || "form").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateFormSubmissionPDFBlobUrl(
  opts: FormSubmissionPDFOptions,
): Promise<string> {
  const resolved = await resolveCompanyLogo(opts);
  const blob = await pdf(<FormSubmissionDocument {...resolved} />).toBlob();
  return URL.createObjectURL(blob);
}
