/**
 * Shared styles, colors, and fonts for all React-PDF reports.
 *
 * Clean, minimal invoice aesthetic — thin rules, no heavy color blocks,
 * generous whitespace. Every report template imports from here so brand
 * changes only need to happen in one place.
 */

import { StyleSheet } from "@react-pdf/renderer";

// ── Palette — monochrome with one accent ──
export const COLORS = {
  black: "#000000",
  dark: "#1a1a1a",
  text: "#333333",
  textMuted: "#666666",
  gray: "#999999",
  lightGray: "#cccccc",
  rule: "#d0d0d0",
  faintBg: "#f7f7f7",
  white: "#FFFFFF",
};

// ── Page / header / footer ──
export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: COLORS.text,
    paddingTop: 16,
    paddingBottom: 50,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
  },

  /* ── Header ── */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 96,
  },
  logoBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  companyInline: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  companyDetailBlock: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  companyDetail: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    textAlign: "right",
    lineHeight: 1.6,
  },
  divider: {
    height: 0.75,
    backgroundColor: COLORS.black,
    marginTop: 4,
    marginBottom: 8,
  },

  /* ── Report title (right-aligned, like "Quote" in the reference) ── */
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    textAlign: "right",
    marginBottom: 4,
  },
  titleMeta: {
    alignItems: "flex-end",
  },
  titleMetaLine: {
    fontSize: 8,
    color: COLORS.textMuted,
    lineHeight: 1.6,
  },

  /* ── Summary strip ── */
  summaryStrip: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
    paddingVertical: 8,
    marginBottom: 16,
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 6.5,
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },

  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.gray,
  },

  /* ── Grand total row ── */
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.black,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    marginRight: 20,
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
});

// ── Table styles ──
export const tableStyles = StyleSheet.create({
  table: {
    marginBottom: 10,
  },

  /* Group header — bold dark bar for strong contrast */
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.dark,
    marginBottom: 0,
  },
  groupHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  groupHeaderRight: {
    fontSize: 7.5,
    color: "#cccccc",
  },
  /* Sub-group header — lighter background for nesting contrast */
  groupHeaderSub: {
    backgroundColor: "#e0e0e0",
  },
  groupHeaderTextSub: {
    color: COLORS.black,
  },

  /* Column headers — light gray background for contrast */
  headerRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.black,
  },
  headerCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    paddingRight: 6,
  },

  /* Data rows */
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.rule,
    minHeight: 16,
  },
  rowAlt: {
    backgroundColor: COLORS.faintBg,
  },
  cell: {
    fontSize: 7.5,
    color: COLORS.text,
    lineHeight: 1.4,
    paddingRight: 6,
  },

  /* Subtotal row */
  subtotalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 0.75,
    borderTopColor: COLORS.black,
  },
  subtotalCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    paddingRight: 6,
  },
});
