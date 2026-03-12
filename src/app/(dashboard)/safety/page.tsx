"use client";

import * as React from "react";
import {
  Plus,
  FileText,
  Eye,
  ShieldCheck,
  MoreHorizontal,
  Pencil,
  FileDown,
  Download,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/components/require-permission";
import { lookupName } from "@/lib/utils/lookup";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { FormRenderer } from "@/components/forms/form-renderer";
import type {
  FormSubmission,
  FormTemplate,
  FormField,
  FormFieldOption,
  FormFieldOptionsSource,
} from "@/lib/types/time-tracking";
import {
  generateFormSubmissionPDF,
  generateFormSubmissionPDFBlobUrl,
} from "@/lib/export/react-pdf/form-submission";

// ── Submission Detail Dialog (view-only) ──
function SubmissionDetailDialog({
  submission,
  template,
  open,
  onClose,
}: {
  submission: FormSubmission;
  template?: FormTemplate;
  open: boolean;
  onClose: () => void;
}) {
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
                      <span className="text-[10px] font-medium text-muted-foreground">Entry #{eIdx + 1}</span>
                      {section.fields
                        .filter((f) => !["section-header", "label"].includes(f.type))
                        .map((field) => (
                          <div key={field.id}>
                            <span className="text-xs text-muted-foreground">{field.label}</span>
                            <div className="text-sm font-medium">{renderValue(field, entry[field.id])}</div>
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
                        <div className="text-sm font-medium">{renderValue(field, submission.values[field.id])}</div>
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

// ── Page view state ──
type PageView =
  | { mode: "list" }
  | { mode: "fill"; template: FormTemplate; existingSubmission?: FormSubmission };

export default function SafetyPage() {
  const { data: formSubmissions, loading, remove } = useFormSubmissions();
  const { data: templates } = useFormTemplates();
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const { data: allEquipment } = useEquipment();
  const { data: allAttachments } = useAttachments();
  const { data: allTools } = useTools();
  const { profile: company } = useCompanyProfile();

  const [view, setView] = React.useState<PageView>({ mode: "list" });
  const [viewingSub, setViewingSub] = React.useState<FormSubmission | null>(null);
  const [search, setSearch] = React.useState("");
  const [templateFilter, setTemplateFilter] = React.useState("all");
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = React.useState(false);
  const [pdfPreviewName, setPdfPreviewName] = React.useState("");

  /** Safety-category templates available for new submissions */
  const safetyTemplates = React.useMemo(
    () => templates.filter((t) => t.category === "safety" && t.status === "active"),
    [templates]
  );

  /** Custom form submissions filed under "safety" category */
  const safetySubmissions = React.useMemo(
    () =>
      formSubmissions
        .filter((fs) => fs.category === "safety")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [formSubmissions]
  );

  /** Templates that have at least one submission (for filter dropdown) */
  const usedTemplates = React.useMemo(
    () => templates.filter((t) => safetySubmissions.some((s) => s.templateId === t.id)),
    [templates, safetySubmissions]
  );

  const templateMap = React.useMemo(() => {
    const map = new Map<string, FormTemplate>();
    for (const t of templates) map.set(t.id, t);
    return map;
  }, [templates]);

  /** Filtered submissions */
  const filtered = React.useMemo(() => {
    let list = safetySubmissions;
    if (templateFilter !== "all") {
      list = list.filter((s) => s.templateId === templateFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.templateName.toLowerCase().includes(q) ||
          s.submittedByName.toLowerCase().includes(q) ||
          (s.projectId ? (lookupName(s.projectId, projects) ?? "") : "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [safetySubmissions, templateFilter, search, projects]);

  const totalCount = safetySubmissions.length;

  /** Build source‐label map for PDF export */
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

  const pdfOpts = (sub: FormSubmission, tpl: FormTemplate) => ({
    name: sub.templateName,
    description: tpl.description,
    sections: tpl.sections,
    values: sub.values,
    requireSignature: tpl.requireSignature,
    signatureDataUrl: sub.signatureUrl,
    company,
    sourceLabelMap,
  });

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

  const closePdfPreview = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewName("");
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success("Submission deleted.");
  };

  // ── Form fill / edit view ──
  if (view.mode === "fill") {
    return (
      <RequirePermission permission="safety.view">
        <FormRenderer
          template={view.template}
          existingSubmission={view.existingSubmission}
          onBack={() => setView({ mode: "list" })}
        />
      </RequirePermission>
    );
  }

  // ── List view ──
  return (
    <RequirePermission permission="safety.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Safety
          </h1>
          <p className="text-muted-foreground">
            Safety form submissions from the custom form builder.
          </p>
        </div>
        {safetyTemplates.length === 1 ? (
          <Button
            size="sm"
            className="gap-1.5 cursor-pointer"
            onClick={() => setView({ mode: "fill", template: safetyTemplates[0] })}
          >
            <Plus className="h-4 w-4" />
            New {safetyTemplates[0].name}
          </Button>
        ) : safetyTemplates.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <Plus className="h-4 w-4" />
                New Form
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {safetyTemplates.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => setView({ mode: "fill", template: t })}
                >
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Summary card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Total Forms
          </div>
          <div className="mt-1 text-2xl font-bold">{totalCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      {safetySubmissions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search safety forms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {usedTemplates.length > 1 && (
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {usedTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Safety Forms Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[110px] text-xs font-semibold px-3">Date</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Form</TableHead>
                  <TableHead className="w-[200px] text-xs font-semibold px-3">Project</TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold px-3">Submitted By</TableHead>
                  <TableHead className="w-[50px] text-xs font-semibold px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">No safety forms yet</p>
                        <p className="text-xs">
                          {safetyTemplates.length > 0
                            ? "Click \"New Form\" above to fill out a safety form."
                            : "Create a form template with the \"Safety\" category to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((fs) => (
                    <TableRow
                      key={fs.id}
                      className="h-[36px] cursor-pointer hover:bg-muted/30"
                      onClick={() => setViewingSub(fs)}
                    >
                      <TableCell className="text-xs px-3 text-muted-foreground">
                        {format(parseISO(fs.date), "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs px-3 font-medium">
                        {fs.templateName}
                      </TableCell>
                      <TableCell className="text-xs px-3">
                        {fs.projectId ? lookupName(fs.projectId, projects) :
                          fs.linkedProjectIds?.length
                            ? fs.linkedProjectIds.map((id) => lookupName(id, projects)).join(", ")
                            : "—"}
                      </TableCell>
                      <TableCell className="text-xs px-3">
                        {fs.submittedByName || lookupName(fs.submittedById, employees)}
                      </TableCell>
                      <TableCell className="px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setViewingSub(fs)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                const tpl = templateMap.get(fs.templateId);
                                if (tpl) setView({ mode: "fill", template: tpl, existingSubmission: fs });
                                else toast.error("Template not found.");
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handlePreviewPDF(fs)}
                            >
                              <FileDown className="h-3.5 w-3.5 mr-2" /> Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={() => handleDelete(fs.id)}
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
              {filtered.length} safety form{filtered.length !== 1 ? "s" : ""}
              {search || templateFilter !== "all" ? " (filtered)" : ""}
            </div>
          )}
        </div>
      )}
    </div>

    {/* View Detail Dialog */}
    {viewingSub && (
      <SubmissionDetailDialog
        submission={viewingSub}
        template={templateMap.get(viewingSub.templateId)}
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
    </RequirePermission>
  );
}
