"use client";

import * as React from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Settings2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ArrowLeft,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ──

export interface ExportColumnDef {
  /** Unique key for this column (used as dataKey for PDF, and to filter CSV columns) */
  id: string;
  /** Display header text */
  header: string;
  /** Whether the column is included by default */
  defaultSelected?: boolean;
}

export interface ExportGroupOption {
  /** Value stored when selected */
  value: string;
  /** Display label */
  label: string;
}

export interface ExportConfig {
  /** Which column IDs are selected */
  selectedColumns: string[];
  /** Group by value (or "none") */
  groupBy: string;
  /** PDF orientation */
  orientation: "portrait" | "landscape";
  /** Report title override */
  title: string;
  /** Export format */
  format: "excel" | "csv" | "pdf";
}

interface ExportDialogProps {
  /** All available columns the user can pick from */
  columns: ExportColumnDef[];
  /** Available grouping options (omit to hide grouping) */
  groupOptions?: ExportGroupOption[];
  /** Default report title */
  defaultTitle: string;
  /** Default orientation */
  defaultOrientation?: "portrait" | "landscape";
  /** Callback when user clicks export */
  onExport: (config: ExportConfig) => void;
  /** Callback to generate a PDF blob URL for preview (if provided, PDF button shows preview first) */
  onGeneratePDFPreview?: (config: ExportConfig) => Promise<string>;
  /** Disable the trigger button */
  disabled?: boolean;
  /** Number of records being exported */
  recordCount?: number;
}

export function ExportDialog({
  columns,
  groupOptions,
  defaultTitle,
  defaultOrientation = "portrait",
  onExport,
  onGeneratePDFPreview,
  disabled,
  recordCount,
}: ExportDialogProps) {
  const [open, setOpen] = React.useState(false);

  // ── State ──
  const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultSelected !== false).map((c) => c.id))
  );
  const [columnOrder, setColumnOrder] = React.useState<string[]>(
    () => columns.map((c) => c.id)
  );
  const [groupBy, setGroupBy] = React.useState("none");
  const [orientation, setOrientation] = React.useState<"portrait" | "landscape">(
    defaultOrientation
  );
  const [title, setTitle] = React.useState(defaultTitle);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // ── PDF Preview State ──
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const previewConfigRef = React.useRef<ExportConfig | null>(null);

  // Cleanup blob URL on unmount or when preview closes
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setSelectedColumns(
        new Set(columns.filter((c) => c.defaultSelected !== false).map((c) => c.id))
      );
      setColumnOrder(columns.map((c) => c.id));
      setGroupBy("none");
      setOrientation(defaultOrientation);
      setTitle(defaultTitle);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewLoading(false);
      previewConfigRef.current = null;
    }
  }, [open, columns, defaultTitle, defaultOrientation]);

  const toggleColumn = (id: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow deselecting all columns
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedColumns(new Set(columns.map((c) => c.id)));
  };

  const selectNone = () => {
    // Keep at least the first column
    setSelectedColumns(new Set([columns[0].id]));
  };

  const moveColumn = (id: string, direction: "up" | "down") => {
    setColumnOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleExport = (format: "excel" | "csv" | "pdf") => {
    const orderedSelected = columnOrder.filter((id) => selectedColumns.has(id));
    const config: ExportConfig = {
      selectedColumns: orderedSelected,
      groupBy,
      orientation,
      title,
      format,
    };

    if (format === "pdf" && onGeneratePDFPreview) {
      // Show preview instead of downloading directly
      setPreviewLoading(true);
      previewConfigRef.current = config;
      onGeneratePDFPreview(config)
        .then((url) => {
          setPreviewUrl(url);
        })
        .catch((err) => {
          console.error("PDF preview failed:", err);
          // Fallback to direct download
          onExport(config);
          setOpen(false);
        })
        .finally(() => setPreviewLoading(false));
      return;
    }

    onExport(config);
    setOpen(false);
  };

  const handleDownloadFromPreview = () => {
    if (previewConfigRef.current) {
      onExport(previewConfigRef.current);
    }
    setOpen(false);
  };

  const handleBackToSettings = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewConfigRef.current = null;
  };

  const orderedColumns = columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter(Boolean) as ExportColumnDef[];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          disabled={disabled}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className={cn(
        "flex flex-col overflow-hidden",
        previewUrl
          ? "sm:max-w-[900px] h-[90vh]"
          : "sm:max-w-[700px] max-h-[85vh]"
      )}>
        {/* ── PDF Preview View ── */}
        {previewUrl ? (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                PDF Preview
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 cursor-pointer"
                onClick={handleBackToSettings}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex-1" />
              <Button
                className="gap-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white"
                size="sm"
                onClick={handleDownloadFromPreview}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </>
        ) : (
        /* ── Settings View ── */
        <>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Export Settings
          </DialogTitle>
          {recordCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              Exporting <Badge variant="secondary" className="mx-1">{recordCount}</Badge> records
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {/* ── Report Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="export-title" className="text-xs font-medium">
              Report Title
            </Label>
            <Input
              id="export-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
              placeholder="Report title..."
            />
          </div>

          {/* ── Group By ── */}
          {groupOptions && groupOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  {groupOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Columns ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Columns ({selectedColumns.size} of {columns.length})
              </Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={selectAll}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={selectNone}
                >
                  None
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-2 space-y-1">
              {orderedColumns.map((col, idx) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 group"
                >
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={selectedColumns.has(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
                    className="flex-1 text-sm cursor-pointer select-none"
                  >
                    {col.header}
                  </Label>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveColumn(col.id, "up")}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveColumn(col.id, "down")}
                      disabled={idx === orderedColumns.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Advanced Settings (collapsible) ── */}
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-3 pb-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  PDF Orientation
                </Label>
                <Select
                  value={orientation}
                  onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator className="shrink-0" />

        {/* ── Export Buttons (always visible at bottom) ── */}
        <div className="flex items-center gap-2 shrink-0 pt-2">
          <Button
            className="flex-1 gap-2 cursor-pointer bg-green-700 hover:bg-green-800 text-white"
            size="sm"
            onClick={() => handleExport("excel")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            className="flex-1 gap-2 cursor-pointer bg-blue-700 hover:bg-blue-800 text-white"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button
            className="flex-1 gap-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={previewLoading}
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {onGeneratePDFPreview ? "Preview PDF" : "PDF"}
          </Button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
