"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

import type {
  FormTemplate,
  FormSection,
  FormField,
  FormFieldType,
  FormFieldOption,
  FormFieldOptionsSource,
} from "@/lib/types/time-tracking";
import { useFormTemplates } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { generateFormSubmissionPDFBlobUrl } from "@/lib/export/react-pdf/form-submission";

const OPTIONS_SOURCES: { value: FormFieldOptionsSource; label: string }[] = [
  { value: "employees", label: "Employees" },
  { value: "projects", label: "Projects" },
  { value: "equipment", label: "Equipment" },
  { value: "attachments", label: "Attachments" },
  { value: "tools", label: "Tools" },
];

/** Short random id using built-in crypto */
const uid = (len = 8) => crypto.randomUUID().replace(/-/g, "").slice(0, len);

/** Strip undefined values so Firestore doesn't reject them */
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ── Field type definitions ──
const FIELD_TYPES: { type: FormFieldType; label: string; description: string }[] = [
  { type: "text", label: "Short Text", description: "Single line text input" },
  { type: "textarea", label: "Long Text", description: "Multi-line text area" },
  { type: "number", label: "Number", description: "Numeric input" },
  { type: "date", label: "Date", description: "Date picker" },
  { type: "time", label: "Time", description: "Time picker" },
  { type: "select", label: "Dropdown", description: "Single selection from a list" },
  { type: "multiselect", label: "Multi-Select", description: "Multiple selections" },
  { type: "checkbox", label: "Checkboxes", description: "Multiple checkbox options" },
  { type: "radio", label: "Radio Buttons", description: "Single selection radio" },
  { type: "toggle", label: "Yes / No", description: "Toggle switch" },
  { type: "photo", label: "Photo", description: "Camera / photo upload" },
  { type: "signature", label: "Signature", description: "Touch signature pad" },
  { type: "weather", label: "Weather", description: "Auto-fill weather from project location" },
  { type: "section-header", label: "Section Header", description: "Visual divider with title" },
  { type: "label", label: "Info Text", description: "Read-only label / instructions" },
];

const CATEGORIES = [
  "equipment",
  "safety",
  "employee",
  "general",
];

function createBlankField(type: FormFieldType): FormField {
  return {
    id: uid(8),
    type,
    label: "",
    required: false,
    width: "full",
    ...(["select", "multiselect", "radio", "checkbox"].includes(type)
      ? { options: [{ label: "", value: uid(4) }] }
      : {}),
  };
}

function createBlankSection(): FormSection {
  return {
    id: uid(8),
    title: "New Section",
    fields: [],
  };
}

// ── Field Editor Dialog ──
function FieldEditorDialog({
  field,
  allFields,
  open,
  onClose,
  onSave,
}: {
  field: FormField;
  allFields: FormField[];
  open: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
}) {
  const [draft, setDraft] = React.useState<FormField>(field);

  React.useEffect(() => {
    setDraft(field);
  }, [field]);

  const hasOptions = ["select", "multiselect", "radio", "checkbox"].includes(draft.type);
  const isLayoutField = ["section-header", "label"].includes(draft.type);
  const otherFields = allFields.filter((f) => f.id !== field.id && !["section-header", "label", "photo", "signature"].includes(f.type));

  const addOption = () => {
    setDraft((d) => ({
      ...d,
      options: [...(d.options || []), { label: "", value: uid(4) }],
    }));
  };

  const removeOption = (idx: number) => {
    setDraft((d) => ({
      ...d,
      options: (d.options || []).filter((_, i) => i !== idx),
    }));
  };

  const updateOption = (idx: number, label: string) => {
    setDraft((d) => ({
      ...d,
      options: (d.options || []).map((o, i) =>
        i === idx ? { ...o, label } : o
      ),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Field</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label */}
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder={isLayoutField ? "Section title or instructions" : "Field label"}
            />
          </div>

          {/* Placeholder (text-ish fields only) */}
          {["text", "textarea", "number"].includes(draft.type) && (
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={draft.placeholder || ""}
                onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
                placeholder="Placeholder text"
              />
            </div>
          )}

          {/* Required toggle */}
          {!isLayoutField && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Required</Label>
              <Switch
                checked={draft.required || false}
                onCheckedChange={(v: boolean) => setDraft((d) => ({ ...d, required: v }))}
              />
            </div>
          )}

          {/* Width */}
          {!isLayoutField && (
            <div>
              <Label className="text-xs">Width</Label>
              <Select
                value={draft.width || "full"}
                onValueChange={(v) => setDraft((d) => ({ ...d, width: v as "full" | "half" }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full width</SelectItem>
                  <SelectItem value="half">Half width</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Options (select, multiselect, radio, checkbox) */}
          {hasOptions && (
            <div className="space-y-3">
              {/* Data Source toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Auto-populate from data</Label>
                  <Switch
                    checked={!!draft.optionsSource}
                    onCheckedChange={(v: boolean) =>
                      setDraft((d) => ({
                        ...d,
                        optionsSource: v ? "employees" : undefined,
                        options: v ? undefined : [{ label: "", value: uid(4) }],
                      }))
                    }
                  />
                </div>
                {draft.optionsSource && (
                  <Select
                    value={draft.optionsSource}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, optionsSource: v as FormFieldOptionsSource }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Manual options (hidden when data source is selected) */}
              {!draft.optionsSource && (
                <div>
                  <Label className="text-xs mb-2 block">Options</Label>
                  <div className="space-y-1.5">
                    {(draft.options || []).map((opt, idx) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 cursor-pointer"
                          onClick={() => removeOption(idx)}
                          disabled={(draft.options || []).length <= 1}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 cursor-pointer"
                      onClick={addOption}
                    >
                      <Plus className="h-3 w-3" /> Add option
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional logic */}
          {!isLayoutField && otherFields.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Conditional visibility</Label>
                <Switch
                  checked={!!draft.conditional}
                  onCheckedChange={(v: boolean) =>
                    setDraft((d) => ({
                      ...d,
                      conditional: v
                        ? { fieldId: otherFields[0].id, operator: "equals", value: "" }
                        : undefined,
                    }))
                  }
                />
              </div>
              {draft.conditional && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                  <Select
                    value={draft.conditional.fieldId}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        conditional: { ...d.conditional!, fieldId: v },
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="When field…" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherFields.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label || `(${f.type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={draft.conditional.operator}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        conditional: {
                          ...d.conditional!,
                          operator: v as "equals" | "not-equals" | "contains",
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not-equals">Does not equal</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={draft.conditional.value}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        conditional: { ...d.conditional!, value: e.target.value },
                      }))
                    }
                    placeholder="Value"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Field Card (inline preview) ──
function FieldCard({
  field,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
}: {
  field: FormField;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const typeDef = FIELD_TYPES.find((t) => t.type === field.type);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 group hover:border-primary/30 transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {field.label || <span className="text-muted-foreground italic">No label</span>}
          </span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {typeDef?.label || field.type}
          </Badge>
          {field.required && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              Required
            </Badge>
          )}
          {field.conditional && (
            <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">
              Conditional
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onMoveDown} disabled={isLast}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive cursor-pointer" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Add Field Palette ──
function AddFieldPalette({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1 border-dashed cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Plus className="h-3 w-3" /> Add Field
      </Button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 p-2 rounded-lg border bg-muted/30">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              onClick={() => {
                onAdd(ft.type);
                setOpen(false);
              }}
              className="text-left px-2.5 py-2 rounded-md hover:bg-card border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <div className="text-xs font-medium">{ft.label}</div>
              <div className="text-[10px] text-muted-foreground">{ft.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Form Preview Dialog ──

/** Build sample values so the PDF preview shows realistic placeholder data */
function buildSampleValues(sections: FormSection[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const section of sections) {
    if (section.repeatable) {
      const entry: Record<string, unknown> = {};
      for (const f of section.fields) {
        entry[f.id] = sampleForField(f);
      }
      values[`__repeatable_${section.id}`] = [entry];
    } else {
      for (const f of section.fields) {
        values[f.id] = sampleForField(f);
      }
    }
  }
  return values;
}

function sampleForField(f: FormField): unknown {
  switch (f.type) {
    case "text":
      return f.placeholder || "Sample text";
    case "textarea":
      return f.placeholder || "Sample long text entry…";
    case "number":
      return "42";
    case "date":
      return new Date().toISOString().slice(0, 10);
    case "time":
      return "08:30";
    case "select":
    case "radio":
      if (f.optionsSource) return f.optionsSource === "employees" ? "John Doe" : "Sample Item";
      return f.options?.[0]?.label || f.options?.[0]?.value || "Option 1";
    case "multiselect":
    case "checkbox":
      if (f.optionsSource) return [f.optionsSource === "employees" ? "John Doe" : "Sample Item"];
      return f.options?.slice(0, 2).map((o) => o.label || o.value) || ["Option 1"];
    case "toggle":
      return true;
    case "weather":
      return { conditions: ["sunny"], temperature: "5°C – 12°C", windSpeed: "15 km/h", precipitation: "None" };
    default:
      return undefined;
  }
}

function FormPreviewDialog({
  open,
  onClose,
  name,
  description,
  sections,
  requireProject,
  requireEquipment,
  requireSignature,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  description: string;
  sections: FormSection[];
  requireProject: boolean;
  requireEquipment: boolean;
  requireSignature: boolean;
}) {
  const { profile: company } = useCompanyProfile();
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("form");

  // Clean up blob URL on close
  React.useEffect(() => {
    if (!open) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setActiveTab("form");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate PDF when switching to pdf tab
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (tab === "pdf" && !pdfUrl) {
      setPdfLoading(true);
      try {
        const sampleValues = buildSampleValues(sections);
        const url = await generateFormSubmissionPDFBlobUrl({
          name: name || "Untitled Form",
          description,
          sections,
          values: sampleValues,
          requireSignature,
          company,
          projectName: requireProject ? "Sample Project" : undefined,
          projectAddress: requireProject ? "123 Main St, Calgary, AB" : undefined,
          equipmentName: requireEquipment ? "Excavator #EX-001" : undefined,
        });
        setPdfUrl(url);
      } catch (e) {
        console.error("Failed to generate PDF preview:", e);
        toast.error("Failed to generate PDF preview");
      } finally {
        setPdfLoading(false);
      }
    }
  };
  // Render a preview of what a field looks like
  const renderFieldPreview = (field: FormField) => {
    const hasOpts = ["select", "multiselect", "radio", "checkbox"].includes(field.type);
    const opts = field.options || [];
    const sourceName = field.optionsSource
      ? OPTIONS_SOURCES.find((s) => s.value === field.optionsSource)?.label
      : null;

    switch (field.type) {
      case "text":
        return <Input disabled placeholder={field.placeholder || "Text input"} />;
      case "textarea":
        return <Textarea disabled placeholder={field.placeholder || "Text area"} rows={2} />;
      case "number":
        return <Input disabled type="number" placeholder={field.placeholder || "0"} />;
      case "date":
        return (
          <div className="flex items-center gap-2">
            <Input disabled type="date" className="flex-1" />
            <Badge variant="outline" className="text-[10px] shrink-0">Today</Badge>
          </div>
        );
      case "time":
        return (
          <div className="flex items-center gap-2">
            <Input disabled type="time" className="flex-1" />
            <Badge variant="outline" className="text-[10px] shrink-0">Now</Badge>
          </div>
        );
      case "select":
        if (sourceName) {
          return (
            <div className="space-y-1">
              <Input disabled placeholder={`Search ${sourceName}…`} />
              <p className="text-[10px] text-muted-foreground">Auto-populated from {sourceName}</p>
            </div>
          );
        }
        return (
          <Select disabled>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label || o.value}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case "multiselect":
      case "checkbox":
        if (sourceName) {
          return (
            <div className="space-y-1">
              <Input disabled placeholder={`Search ${sourceName}…`} />
              <p className="text-[10px] text-muted-foreground">Auto-populated from {sourceName} (multi-select)</p>
            </div>
          );
        }
        return (
          <div className="space-y-1">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <Checkbox disabled /> {o.label || o.value}
              </label>
            ))}
          </div>
        );
      case "radio":
        return (
          <div className="space-y-1">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input type="radio" disabled className="accent-primary" /> {o.label || o.value}
              </label>
            ))}
          </div>
        );
      case "toggle":
        return (
          <div className="flex items-center gap-2">
            <Switch disabled /> <span className="text-sm text-muted-foreground">No</span>
          </div>
        );
      case "photo":
        return (
          <div className="border rounded-lg p-3 text-center text-xs text-muted-foreground border-dashed">
            📷 Photo upload area
          </div>
        );
      case "signature":
        return (
          <div className="border rounded-lg p-4 text-center text-xs text-muted-foreground border-dashed">
            ✍️ Signature pad
          </div>
        );
      case "section-header":
        return null;
      case "label":
        return null;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Form Preview
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-fit">
            <TabsTrigger value="form" className="gap-1.5 cursor-pointer">
              <Eye className="h-3.5 w-3.5" /> Form View
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-1.5 cursor-pointer">
              <FileText className="h-3.5 w-3.5" /> PDF Preview
            </TabsTrigger>
          </TabsList>

          {/* ── Form View Tab ── */}
          <TabsContent value="form" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-6 py-2">
          {/* Form title */}
          <div>
            <h2 className="text-lg font-bold">{name || "Untitled Form"}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>

          {/* Project selector preview */}
          {requireProject && (
            <div>
              <Label className="text-xs font-medium">Project</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select project…" />
                </SelectTrigger>
              </Select>
            </div>
          )}

          {/* Equipment selector preview */}
          {requireEquipment && (
            <div>
              <Label className="text-xs font-medium">Equipment</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment…" />
                </SelectTrigger>
              </Select>
            </div>
          )}

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {section.title && (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </h3>
                    {section.repeatable && (
                      <Badge variant="secondary" className="text-[10px]">Repeatable</Badge>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {section.repeatable && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#1</span>
                  </div>
                  <div className="space-y-3">
                    {section.fields.map((field) => {
                      if (field.type === "section-header") {
                        return <h4 key={field.id} className="text-sm font-bold pt-1">{field.label}</h4>;
                      }
                      if (field.type === "label") {
                        return <p key={field.id} className="text-sm text-muted-foreground">{field.label}</p>;
                      }
                      return (
                        <div key={field.id} className={field.width === "half" ? "w-1/2 inline-block pr-2 align-top" : ""}>
                          <Label className="text-xs font-medium mb-1 block">
                            {field.label || <span className="italic text-muted-foreground">No label</span>}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                          </Label>
                          {renderFieldPreview(field)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!section.repeatable && (
                <div className="space-y-4">
                  {section.fields.map((field) => {
                    if (field.type === "section-header") {
                      return <h4 key={field.id} className="text-sm font-bold pt-2">{field.label}</h4>;
                    }
                    if (field.type === "label") {
                      return <p key={field.id} className="text-sm text-muted-foreground">{field.label}</p>;
                    }
                    return (
                      <div key={field.id} className={field.width === "half" ? "w-1/2 inline-block pr-2 align-top" : ""}>
                        <Label className="text-xs font-medium mb-1 block">
                          {field.label || <span className="italic text-muted-foreground">No label</span>}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        {renderFieldPreview(field)}
                      </div>
                    );
                  })}
                </div>
              )}

              {section.repeatable && (
                <Button variant="outline" size="sm" disabled className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Entry
                </Button>
              )}
            </div>
          ))}

          {/* Signature preview */}
          {requireSignature && (
            <div>
              <Label className="text-xs font-medium mb-1 block">Signature <span className="text-destructive">*</span></Label>
              <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground border-dashed">
                ✍️ Signature pad
              </div>
            </div>
          )}

          {/* Submit button preview */}
          <div className="border-t pt-4">
            <Button disabled className="w-full gap-1.5">
              <Save className="h-4 w-4" /> Submit Form
            </Button>
          </div>
        </div>
          </TabsContent>

          {/* ── PDF Preview Tab ── */}
          <TabsContent value="pdf" className="flex-1 overflow-hidden mt-4">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Generating PDF…</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[60vh] rounded-lg border"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">
                PDF preview will appear here
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Template Builder ──
interface TemplateBuilderProps {
  templateId?: string;     // if editing existing
  onBack: () => void;
}

export function TemplateBuilder({ templateId, onBack }: TemplateBuilderProps) {
  const { user } = useAuth();
  const { data: templates, add, update } = useFormTemplates();
  const [saving, setSaving] = React.useState(false);

  // Template state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [requireProject, setRequireProject] = React.useState(true);
  const [requireEquipment, setRequireEquipment] = React.useState(false);
  const [requireSignature, setRequireSignature] = React.useState(false);
  const [sections, setSections] = React.useState<FormSection[]>([createBlankSection()]);

  // Field editor dialog
  const [editingField, setEditingField] = React.useState<{ sectionIdx: number; fieldIdx: number } | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  // Load existing template
  React.useEffect(() => {
    if (!templateId) return;
    const existing = templates.find((t) => t.id === templateId);
    if (existing) {
      setName(existing.name);
      setDescription(existing.description || "");
      setCategory(existing.category);
      setRequireProject(existing.requireProject ?? true);
      setRequireEquipment(existing.requireEquipment ?? false);
      setRequireSignature(existing.requireSignature ?? false);
      setSections(existing.sections.length > 0 ? existing.sections : [createBlankSection()]);
    }
  }, [templateId, templates]);

  // All fields (flattened) for conditional field references
  const allFields = React.useMemo(
    () => sections.flatMap((s) => s.fields),
    [sections]
  );

  // ── Section operations ──
  const addSection = () => {
    setSections((prev) => [...prev, createBlankSection()]);
  };

  const removeSection = (idx: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSectionTitle = (idx: number, title: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, title } : s)));
  };

  const toggleSectionRepeatable = (idx: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, repeatable: !s.repeatable } : s))
    );
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveSectionDown = (idx: number) => {
    if (idx === sections.length - 1) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // ── Field operations ──
  const addField = (sectionIdx: number, type: FormFieldType) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, fields: [...s.fields, createBlankField(type)] } : s
      )
    );
  };

  const removeField = (sectionIdx: number, fieldIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIdx) } : s
      )
    );
  };

  const updateField = (sectionIdx: number, fieldIdx: number, field: FormField) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? { ...s, fields: s.fields.map((f, fi) => (fi === fieldIdx ? field : f)) }
          : s
      )
    );
  };

  const moveFieldUp = (sectionIdx: number, fieldIdx: number) => {
    if (fieldIdx === 0) return;
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        const fields = [...s.fields];
        [fields[fieldIdx - 1], fields[fieldIdx]] = [fields[fieldIdx], fields[fieldIdx - 1]];
        return { ...s, fields };
      })
    );
  };

  const moveFieldDown = (sectionIdx: number, fieldIdx: number) => {
    const section = sections[sectionIdx];
    if (fieldIdx === section.fields.length - 1) return;
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        const fields = [...s.fields];
        [fields[fieldIdx], fields[fieldIdx + 1]] = [fields[fieldIdx + 1], fields[fieldIdx]];
        return { ...s, fields };
      })
    );
  };

  const duplicateField = (sectionIdx: number, fieldIdx: number) => {
    const field = sections[sectionIdx].fields[fieldIdx];
    const copy: FormField = {
      ...field,
      id: uid(8),
      label: `${field.label} (copy)`,
      options: field.options?.map((o) => ({ ...o, value: uid(4) })),
    };
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? { ...s, fields: [...s.fields.slice(0, fieldIdx + 1), copy, ...s.fields.slice(fieldIdx + 1)] }
          : s
      )
    );
  };

  // ── Save ──
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a form name.");
      return;
    }
    if (sections.every((s) => s.fields.length === 0)) {
      toast.error("Add at least one field to the form.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const base = stripUndefined({
        name: name.trim(),
        description: description.trim() || "",
        category,
        sections,
        status: "active" as const,
        requireProject,
        requireEquipment,
        requireSignature,
        updatedAt: now,
      });

      if (templateId) {
        await update(templateId, base);
        toast.success("Template updated.");
      } else {
        await add({
          ...base,
          id: `form-${uid(10)}`,
          createdBy: user?.uid || "",
          createdAt: now,
        });
        toast.success("Template created.");
      }
      onBack();
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Currently editing field
  const currentEditField =
    editingField !== null
      ? sections[editingField.sectionIdx]?.fields[editingField.fieldIdx]
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">
            {templateId ? "Edit Template" : "New Form Template"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5 cursor-pointer" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button className="gap-1.5 cursor-pointer" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Template Metadata */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Form Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Equipment Pre-Use Inspection"
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this form"
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={requireProject} onCheckedChange={setRequireProject} />
            <Label className="text-xs">Require project selection</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={requireEquipment} onCheckedChange={setRequireEquipment} />
            <Label className="text-xs">Require equipment selection</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
            <Label className="text-xs">Require signature</Label>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sIdx) => (
          <div key={section.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={section.title}
                onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                className="h-8 text-sm font-semibold border-none bg-transparent shadow-none px-1 focus-visible:ring-0"
                placeholder="Section title"
              />
              <div className="flex items-center gap-0.5 ml-auto shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => moveSectionUp(sIdx)} disabled={sIdx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => moveSectionDown(sIdx)} disabled={sIdx === sections.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive cursor-pointer"
                  onClick={() => removeSection(sIdx)}
                  disabled={sections.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Repeatable toggle */}
            <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/10">
              <Switch
                checked={section.repeatable || false}
                onCheckedChange={() => toggleSectionRepeatable(sIdx)}
                className="scale-75"
              />
              <Label className="text-[11px] text-muted-foreground">
                Repeatable section
              </Label>
              {section.repeatable && (
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  Users can add multiple entries
                </Badge>
              )}
            </div>

            {/* Fields */}
            <div className="p-4 space-y-2">
              {section.fields.map((field, fIdx) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  onEdit={() => setEditingField({ sectionIdx: sIdx, fieldIdx: fIdx })}
                  onRemove={() => removeField(sIdx, fIdx)}
                  onMoveUp={() => moveFieldUp(sIdx, fIdx)}
                  onMoveDown={() => moveFieldDown(sIdx, fIdx)}
                  onDuplicate={() => duplicateField(sIdx, fIdx)}
                  isFirst={fIdx === 0}
                  isLast={fIdx === section.fields.length - 1}
                />
              ))}

              {section.fields.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No fields yet. Add one below.
                </p>
              )}

              <AddFieldPalette onAdd={(type) => addField(sIdx, type)} />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full gap-1.5 cursor-pointer"
          onClick={addSection}
        >
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </div>

      {/* Field Editor Dialog */}
      {currentEditField && editingField && (
        <FieldEditorDialog
          field={currentEditField}
          allFields={allFields}
          open={!!editingField}
          onClose={() => setEditingField(null)}
          onSave={(f) => updateField(editingField.sectionIdx, editingField.fieldIdx, f)}
        />
      )}

      {/* Preview Dialog */}
      <FormPreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        name={name}
        description={description}
        sections={sections}
        requireProject={requireProject}
        requireEquipment={requireEquipment}
        requireSignature={requireSignature}
      />
    </div>
  );
}
