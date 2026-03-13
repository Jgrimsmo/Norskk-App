"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Eye,
  FileText,
  FileDown,
  Download,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import { ColumnFilter } from "@/components/time-tracking/column-filter";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import {
  generateFormSubmissionPDF,
  generateFormSubmissionPDFBlobUrl,
} from "@/lib/export/react-pdf/form-submission";

import {
  useFormSubmissions,
  useFormTemplates,
  useProjects,
  useEmployees,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import type {
  FormSubmission,
  FormTemplate,
  FormField,
  FormFieldOption,
  FormFieldOptionsSource,
} from "@/lib/types/time-tracking";

// ── Submission Detail Dialog ──
function SubmissionDetailDialog({
  submission,
  template,
  projectName,
  open,
  onClose,
}: {
  submission: FormSubmission;
  template?: FormTemplate;
  projectName: string;
  open: boolean;
  onClose: () => void;
}) {
  const allFields: FormField[] = template?.sections.flatMap((s) => s.fields) || [];

  const { data: employees } = useEmployees();
  const { data: allEquipment } = useEquipment();
  const { data: allAttachments } = useAttachments();
  const { data: allTools } = useTools();
  const { data: allProjects } = useProjects();

  const sourceOptions = React.useMemo<Record<FormFieldOptionsSource, FormFieldOption[]>>(() => ({
    employees: employees.map((e) => ({ value: e.id, label: e.name })),
    projects: allProjects.map((p) => ({ value: p.id, label: p.name })),
    equipment: allEquipment
      .filter((e) => e.id !== EQUIPMENT_NONE_ID)
      .map((e) => ({ value: e.id, label: e.number ? `${e.name} #${e.number}` : e.name })),
    attachments: allAttachments.map((a) => ({ value: a.id, label: a.number ? `${a.name} #${a.number}` : a.name })),
    tools: allTools.map((t) => ({ value: t.id, label: t.number ? `${t.name} #${t.number}` : t.name })),
  }), [employees, allProjects, allEquipment, allAttachments, allTools]);

  const getOptions = (field: FormField) => {
    if (field.optionsSource) return sourceOptions[field.optionsSource];
    return field.options || [];
  };

  const renderValue = (field: FormField, value: unknown) => {
    if (value === undefined || value === null || value === "") return <span className="text-muted-foreground">—</span>;
    if (field.type === "toggle") return value === true || value === "true" || value === "yes" ? "Yes" : "No";
    if (field.type === "photo" && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {(value as string[]).map((url, i) => (
            <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded object-cover border" />
          ))}
        </div>
      );
    }
    if (field.type === "signature" && typeof value === "string" && value) {
      return <img src={value} alt="Signature" className="max-h-16 mt-1" />;
    }
    const opts = getOptions(field);
    if (Array.isArray(value)) {
      const labels = (value as string[]).map((v) => {
        const opt = opts.find((o) => o.value === v);
        return opt?.label || v;
      });
      return labels.join(", ");
    }
    if (field.type === "select" || field.type === "radio") {
      const opt = opts.find((o) => o.value === String(value));
      return opt?.label || String(value);
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submission.templateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Submitted By</span>
              <p className="font-medium">{submission.submittedByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Date</span>
              <p className="font-medium">{submission.date}</p>
            </div>
            {projectName && (
              <div>
                <span className="text-muted-foreground text-xs">Project</span>
                <p className="font-medium">{projectName}</p>
              </div>
            )}
          </div>

          <Separator />

          {template?.sections.map((section) => (
            <div key={section.id}>
              {section.title && (
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {section.title}
                </h4>
              )}
              {section.repeatable ? (
                <div className="space-y-3">
                  {((submission.values[`__repeatable_${section.id}`] as Record<string, unknown>[] | undefined) ?? []).map((entry, eIdx) => (
                    <div key={eIdx} className="rounded-lg border p-2 space-y-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Entry #{eIdx + 1}
                      </span>
                      {section.fields
                        .filter((f) => !["section-header", "label"].includes(f.type))
                        .map((field) => (
                          <div key={field.id}>
                            <span className="text-xs text-muted-foreground">{field.label}</span>
                            <div className="text-sm font-medium">
                              {renderValue(field, entry[field.id])}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {section.fields
                    .filter((f) => !["section-header", "label"].includes(f.type))
                    .map((field) => (
                      <div key={field.id}>
                        <span className="text-xs text-muted-foreground">{field.label}</span>
                        <div className="text-sm font-medium">
                          {renderValue(field, submission.values[field.id])}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Submissions Table ──
export function SubmissionsTable() {
  const { data: submissions, remove } = useFormSubmissions();
  const { data: templates } = useFormTemplates();
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const { data: allEquipment } = useEquipment();
  const { data: allAttachments } = useAttachments();
  const { data: allTools } = useTools();
  const { profile: company } = useCompanyProfile();
  const [viewingSub, setViewingSub] = React.useState<FormSubmission | null>(null);

  // Column filters (Set-based for ColumnFilter)
  const [formFilter, setFormFilter] = React.useState<Set<string>>(new Set());
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(new Set());
  const [submittedByFilter, setSubmittedByFilter] = React.useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  // Selection for bulk export
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = React.useState(false);
  const [pdfPreviewName, setPdfPreviewName] = React.useState("");

  const templateMap = React.useMemo(() => {
    const map = new Map<string, FormTemplate>();
    for (const t of templates) map.set(t.id, t);
    return map;
  }, [templates]);

  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  // Filter options derived from data
  const formOptions = React.useMemo(
    () =>
      [...new Set(submissions.map((s) => s.templateId))].map((id) => ({
        id,
        label: submissions.find((s) => s.templateId === id)?.templateName || id,
      })),
    [submissions]
  );

  const projectOptions = React.useMemo(
    () =>
      [...new Set(submissions.map((s) => s.projectId).filter(Boolean))].map((id) => ({
        id: id!,
        label: projectMap.get(id!) || id!,
      })),
    [submissions, projectMap]
  );

  const submittedByOptions = React.useMemo(
    () =>
      [...new Set(submissions.map((s) => s.submittedByName).filter(Boolean))].map((name) => ({
        id: name,
        label: name,
      })),
    [submissions]
  );

  /** Build source-label map for PDF export */
  const sourceLabelMap = React.useMemo<Record<string, Record<string, string>>>(() => ({
    employees: Object.fromEntries(employees.map((e) => [e.id, e.name])),
    projects: Object.fromEntries(projects.map((p) => [p.id, p.name])),
    equipment: Object.fromEntries(
      allEquipment
        .filter((e) => e.id !== EQUIPMENT_NONE_ID)
        .map((e) => [e.id, e.number ? `${e.name} #${e.number}` : e.name])
    ),
    attachments: Object.fromEntries(
      allAttachments.map((a) => [a.id, a.number ? `${a.name} #${a.number}` : a.name])
    ),
    tools: Object.fromEntries(
      allTools.map((t) => [t.id, t.number ? `${t.name} #${t.number}` : t.name])
    ),
  }), [employees, projects, allEquipment, allAttachments, allTools]);

  const pdfOpts = (sub: FormSubmission, tpl: FormTemplate) => {
    const proj = sub.projectId ? projects.find((p) => p.id === sub.projectId) : undefined;
    const equip = sub.equipmentId ? allEquipment.find((e) => e.id === sub.equipmentId) : undefined;
    const projectAddress = proj
      ? [proj.address, proj.city, proj.province].filter(Boolean).join(", ")
      : undefined;
    return {
      name: sub.templateName,
      description: tpl.description,
      sections: tpl.sections,
      values: sub.values,
      requireSignature: tpl.requireSignature,
      signatureDataUrl: sub.signatureUrl,
      company,
      sourceLabelMap,
      projectName: proj?.name,
      projectAddress,
      equipmentName: equip ? (equip.number ? `${equip.name} #${equip.number}` : equip.name) : undefined,
    };
  };

  const filtered = React.useMemo(() => {
    let list = submissions;
    if (formFilter.size > 0) {
      list = list.filter((s) => formFilter.has(s.templateId));
    }
    if (projectFilter.size > 0) {
      list = list.filter((s) => s.projectId && projectFilter.has(s.projectId));
    }
    if (submittedByFilter.size > 0) {
      list = list.filter((s) => submittedByFilter.has(s.submittedByName));
    }
    if (dateRange?.from || dateRange?.to) {
      list = list.filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
        return true;
      });
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [submissions, formFilter, projectFilter, submittedByFilter, dateRange]);

  const handleDelete = async (id: string) => {
    await remove(id);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.success("Submission deleted.");
  };

  // ── PDF handlers ──
  const handlePreviewPDF = async (sub: FormSubmission) => {
    const tpl = templateMap.get(sub.templateId);
    if (!tpl) { toast.error("Template not found."); return; }
    setPdfPreviewLoading(true);
    setPdfPreviewName(sub.templateName);
    try {
      const url = await generateFormSubmissionPDFBlobUrl(pdfOpts(sub, tpl));
      setPdfPreviewUrl(url);
    } catch {
      toast.error("Failed to generate PDF preview.");
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  const handleDownloadPDF = async (sub: FormSubmission) => {
    const tpl = templateMap.get(sub.templateId);
    if (!tpl) { toast.error("Template not found."); return; }
    try {
      await generateFormSubmissionPDF(pdfOpts(sub, tpl));
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleBulkExport = async () => {
    const selected = filtered.filter((s) => selectedIds.has(s.id));
    if (selected.length === 0) return;
    let success = 0;
    for (const sub of selected) {
      const tpl = templateMap.get(sub.templateId);
      if (!tpl) continue;
      try {
        await generateFormSubmissionPDF(pdfOpts(sub, tpl));
        success++;
      } catch { /* skip */ }
    }
    toast.success(`Downloaded ${success} PDF${success !== 1 ? "s" : ""}.`);
    setSelectedIds(new Set());
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewName("");
  };

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-xs font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 cursor-pointer"
            onClick={handleBulkExport}
          >
            <FileDown className="h-3.5 w-3.5" /> Export {selectedIds.size} PDF{selectedIds.size !== 1 ? "s" : ""}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 cursor-pointer"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 && submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">No entries yet</h3>
          <p className="text-sm text-muted-foreground">
            Form entries from the field will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[40px] px-3">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3">
                    <DateColumnFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                  </TableHead>
                  <TableHead className="min-w-[140px] text-xs font-semibold px-3">
                    <ColumnFilter
                      title="Form"
                      options={formOptions}
                      selected={formFilter}
                      onChange={setFormFilter}
                    />
                  </TableHead>
                  <TableHead className="w-[200px] text-xs font-semibold px-3">
                    <ColumnFilter
                      title="Project"
                      options={projectOptions}
                      selected={projectFilter}
                      onChange={setProjectFilter}
                    />
                  </TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold px-3">
                    <ColumnFilter
                      title="Submitted By"
                      options={submittedByOptions}
                      selected={submittedByFilter}
                      onChange={setSubmittedByFilter}
                    />
                  </TableHead>
                  <TableHead className="w-[40px] text-xs font-semibold px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">No matching entries</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="group h-[36px] cursor-pointer hover:bg-muted/30"
                      onClick={() => setViewingSub(sub)}
                    >
                      <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(sub.id)}
                          onCheckedChange={() => toggleOne(sub.id)}
                          aria-label={`Select ${sub.templateName}`}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-xs px-3 text-muted-foreground">
                        {sub.date ? format(parseISO(sub.date), "MM/dd/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-xs px-3 font-medium">{sub.templateName}</TableCell>
                      <TableCell className="text-xs px-3 text-muted-foreground truncate max-w-[200px]">
                        {sub.projectId ? (projectMap.get(sub.projectId) ?? "—") : "—"}
                      </TableCell>
                      <TableCell className="text-xs px-3">
                        {sub.submittedByName}
                      </TableCell>
                      <TableCell className="text-xs px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setViewingSub(sub)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handlePreviewPDF(sub)}
                            >
                              <FileDown className="h-3.5 w-3.5 mr-2" /> Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={() => handleDelete(sub.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      {viewingSub && (
        <SubmissionDetailDialog
          submission={viewingSub}
          template={templateMap.get(viewingSub.templateId)}
          projectName={viewingSub.projectId ? (projectMap.get(viewingSub.projectId) ?? "") : ""}
          open={!!viewingSub}
          onClose={() => setViewingSub(null)}
        />
      )}

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreviewUrl || pdfPreviewLoading} onOpenChange={(o) => { if (!o) closePdfPreview(); }}>
        <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{pdfPreviewName} — PDF Preview</DialogTitle>
              {pdfPreviewUrl && (
                <Button
                  size="sm"
                  className="gap-1.5 cursor-pointer mr-6"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = pdfPreviewUrl;
                    a.download = `${pdfPreviewName}.pdf`;
                    a.click();
                    toast.success("PDF downloaded.");
                  }}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            {pdfPreviewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title="PDF Preview"
                className="w-full h-full rounded border"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
