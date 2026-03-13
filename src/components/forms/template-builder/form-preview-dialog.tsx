"use client";

import * as React from "react";
import { Eye, FileText, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

import type { FormField, FormSection } from "@/lib/types/forms";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { generateFormSubmissionPDFBlobUrl } from "@/lib/export/react-pdf/form-submission";
import { OPTIONS_SOURCES } from "./constants";

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

// Render a preview of what a field looks like
function renderFieldPreview(field: FormField) {
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
}

interface FormPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  description: string;
  sections: FormSection[];
  requireProject: boolean;
  requireEquipment: boolean;
  requireSignature: boolean;
}

export function FormPreviewDialog({
  open,
  onClose,
  name,
  description,
  sections,
  requireProject,
  requireEquipment,
  requireSignature,
}: FormPreviewDialogProps) {
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
