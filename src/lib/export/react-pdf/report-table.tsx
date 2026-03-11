/**
 * Generic table component for React-PDF reports.
 *
 * Supports:
 *  - Column definitions with flex widths and alignment
 *  - Alternating row shading
 *  - Optional group header rows (with label + right-side detail)
 *  - Optional subtotal rows
 *
 * Usage:
 *   <ReportTable columns={cols} rows={data} />
 */

import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { tableStyles } from "./styles";

export interface TableColumn {
  /** Unique key matching the row data key */
  key: string;
  /** Column header label */
  header: string;
  /** Flex value controlling width proportion (default: 1) */
  flex?: number;
  /** Text alignment (default: "left") */
  align?: "left" | "center" | "right";
}

export interface TableRow {
  [key: string]: string | number;
}

interface ReportTableProps {
  columns: TableColumn[];
  rows: TableRow[];
  /** Optional group header text (rendered as a full-width primary bar) */
  groupHeader?: string;
  /** Optional right-side detail text in the group header (e.g. "42.5 hrs") */
  groupHeaderRight?: string;
  /** Optional subtotal row (rendered with bold styling at the bottom) */
  subtotal?: TableRow;
  /** Nesting depth for multi-level grouping (0 = top level) */
  depth?: number;
}

export function ReportTable({
  columns,
  rows,
  groupHeader,
  groupHeaderRight,
  subtotal,
  depth = 0,
}: ReportTableProps) {
  const indent = depth * 12;
  const hasRows = rows.length > 0;

  return (
    <View style={[tableStyles.table, indent > 0 ? { marginLeft: indent } : {}]} wrap={false}>
      {/* Group header */}
      {groupHeader && (
        <View style={[
          tableStyles.groupHeader,
          depth > 0 ? tableStyles.groupHeaderSub : {},
        ]}>
          <Text style={[
            tableStyles.groupHeaderText,
            depth > 0 ? { fontSize: 8, color: "#1a1a1a" } : {},
          ]}>{groupHeader}</Text>
          {groupHeaderRight && (
            <Text style={[
              tableStyles.groupHeaderRight,
              depth > 0 ? { color: "#666666" } : {},
            ]}>{groupHeaderRight}</Text>
          )}
        </View>
      )}

      {/* Column headers — only when there are data rows */}
      {hasRows && (
        <View style={tableStyles.headerRow}>
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                tableStyles.headerCell,
                {
                  flex: col.flex ?? 1,
                  textAlign: col.align ?? "left",
                },
              ]}
            >
              {col.header}
            </Text>
          ))}
        </View>
      )}

      {/* Data rows */}
      {rows.map((row, i) => (
        <View
          key={i}
          style={[tableStyles.row, ...(i % 2 === 1 ? [tableStyles.rowAlt] : [])]}
        >
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                tableStyles.cell,
                {
                  flex: col.flex ?? 1,
                  textAlign: col.align ?? "left",
                },
              ]}
            >
              {String(row[col.key] ?? "")}
            </Text>
          ))}
        </View>
      ))}

      {/* Subtotal row */}
      {subtotal && (
        <View style={tableStyles.subtotalRow}>
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                tableStyles.subtotalCell,
                {
                  flex: col.flex ?? 1,
                  textAlign: col.align ?? "left",
                },
              ]}
            >
              {String(subtotal[col.key] ?? "")}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
