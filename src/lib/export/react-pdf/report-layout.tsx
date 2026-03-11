/**
 * Reusable page wrapper with company header and page footer.
 *
 * Clean invoice style: logo + company name top-left, address top-right,
 * thin black rule, report title, content, thin-rule footer.
 */

import React from "react";
import { Page, View, Text, Image } from "@react-pdf/renderer";
import { baseStyles, COLORS } from "./styles";
import type { CompanyProfile } from "@/lib/types/time-tracking";

interface ReportPageProps {
  company?: CompanyProfile | null;
  title: string;
  dateRange?: string;
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
}

export function ReportPage({
  company,
  title,
  dateRange,
  orientation = "landscape",
  children,
}: ReportPageProps) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const addressParts = [company?.address, company?.city, company?.province, company?.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Page size="LETTER" orientation={orientation} style={baseStyles.page}>
      {/* ── Company header ── */}
      <View style={baseStyles.headerRow}>
        {/* Left: logo + name + inline address */}
        <View>
          <View style={baseStyles.logoBlock}>
            {(company?.pdfLogoUrl || company?.logoUrl) ? (
              <Image
                src={company.pdfLogoUrl || company.logoUrl}
                style={{ width: 96, height: 96, objectFit: "contain" }}
              />
            ) : null}
            <View>
              <Text style={baseStyles.companyName}>
                {company?.name || "Norskk"}
              </Text>
              {addressParts && (
                <Text style={baseStyles.companyInline}>{addressParts}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Right: title + contact details + date */}
        <View style={baseStyles.companyDetailBlock}>
          <Text style={baseStyles.titleText}>{title}</Text>
          {company?.email && (
            <Text style={baseStyles.companyDetail}>
              Email: {company.email}
            </Text>
          )}
          {company?.phone && (
            <Text style={baseStyles.companyDetail}>
              Phone: {company.phone}
            </Text>
          )}
          {company?.website && (
            <Text style={baseStyles.companyDetail}>
              Website: {company.website}
            </Text>
          )}
          <Text style={baseStyles.companyDetail}>Date: {today}</Text>
          {dateRange && (
            <Text style={baseStyles.companyDetail}>Period: {dateRange}</Text>
          )}
        </View>
      </View>

      {/* Thin black rule */}
      <View style={baseStyles.divider} />

      {/* ── Content ── */}
      {children}

      {/* ── Footer ── */}
      <View style={baseStyles.footer} fixed>
        <Text style={baseStyles.footerText}>
          {company?.name || "Norskk"}
        </Text>
        <Text
          style={baseStyles.footerText}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

/** Summary strip — a row of stat cards between thin rules */
export function SummaryStrip({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <View style={baseStyles.summaryStrip}>
      {items.map((item) => (
        <View key={item.label} style={baseStyles.summaryItem}>
          <Text style={baseStyles.summaryLabel}>{item.label}</Text>
          <Text style={baseStyles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Grand total — right-aligned, bold, like an invoice total */
export function GrandTotalBar({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={baseStyles.grandTotalRow}>
      <Text style={baseStyles.grandTotalLabel}>{label}</Text>
      <Text style={baseStyles.grandTotalValue}>{value}</Text>
    </View>
  );
}
