"use client";

import * as React from "react";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Save, Share2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import type {
  FormTemplate,
  FormField,
  FormFieldOption,
  FormFieldOptionsSource,
  FormSubmission,
} from "@/lib/types/time-tracking";
import {
  useFormSubmissions,
  useProjects,
  useEmployees,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCurrentEmployee } from "@/hooks/use-current-employee";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useSharePDF } from "@/hooks/use-share-pdf";
import { generateFormSubmissionPDFBlobUrl } from "@/lib/export/react-pdf/form-submission";

import { isFieldVisible, extractLinkedIds, type WeatherValue } from "./form-utils";
import { RenderField } from "./form-field-renderer";
import { WeatherField } from "./form-weather-field";
import { RepeatableSection } from "./form-repeatable-section";

interface FormRendererProps {
  template: FormTemplate;
  existingSubmission?: FormSubmission;
  onBack: () => void;
}

export function FormRenderer({ template, existingSubmission, onBack }: FormRendererProps) {
  const { user } = useAuth();
  const { employee } = useCurrentEmployee();
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const { add, update } = useFormSubmissions();
  const { profile: company } = useCompanyProfile();
  const { sharePDF, sharing } = useSharePDF();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Resolve data-source options for fields that use optionsSource
  const sourceOptions = React.useMemo<Record<FormFieldOptionsSource, FormFieldOption[]>>(() => ({
    employees: employees
      .filter((e) => e.status === "active")
      .map((e) => ({ value: e.id, label: e.name })),
    projects: projects
      .filter((p) => p.status === "active")
      .map((p) => ({ value: p.id, label: p.name })),
    equipment: equipment
      .filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID)
      .map((e) => ({ value: e.id, label: e.number ? `${e.name} #${e.number}` : e.name })),
    attachments: attachments
      .filter((a) => a.status !== "retired")
      .map((a) => ({ value: a.id, label: a.number ? `${a.name} #${a.number}` : a.name })),
    tools: tools
      .filter((t) => t.status !== "retired" && t.status !== "lost")
      .map((t) => ({ value: t.id, label: t.number ? `${t.name} #${t.number}` : t.name })),
  }), [employees, projects, equipment, attachments, tools]);

  const getFieldOptions = (field: FormField): FormFieldOption[] | undefined => {
    if (field.optionsSource) return sourceOptions[field.optionsSource];
    return undefined;
  };

  const [values, setValues] = React.useState<Record<string, unknown>>(
    existingSubmission?.values || {}
  );
  const [projectId, setProjectId] = React.useState(existingSubmission?.projectId || "");
  const [equipmentId, setEquipmentId] = React.useState(existingSubmission?.equipmentId || "");

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validate = (): string | null => {
    if (template.requireProject && !projectId) {
      return "Please select a project.";
    }
    if (template.requireEquipment && !equipmentId) {
      return "Please select equipment.";
    }
    for (const section of template.sections) {
      if (section.repeatable) {
        const entries = (values[`__repeatable_${section.id}`] as Record<string, unknown>[] | undefined) ?? [{}];
        for (let eIdx = 0; eIdx < entries.length; eIdx++) {
          const entry = entries[eIdx];
          for (const field of section.fields) {
            if (!isFieldVisible(field, entry)) continue;
            if (!field.required) continue;
            const v = entry[field.id];
            if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
              return `"${field.label}" is required (entry #${eIdx + 1}).`;
            }
            if (field.type === "weather" && v && typeof v === "object" && (!("conditions" in v) || !(v as WeatherValue).conditions?.length)) {
              return `"${field.label}" requires at least one weather condition (entry #${eIdx + 1}).`;
            }
          }
        }
      } else {
        for (const field of section.fields) {
          if (!isFieldVisible(field, values)) continue;
          if (!field.required) continue;
          const v = values[field.id];
          if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
            return `"${field.label}" is required.`;
          }
          if (field.type === "weather" && v && typeof v === "object" && (!("conditions" in v) || !(v as WeatherValue).conditions?.length)) {
            return `"${field.label}" requires at least one weather condition.`;
          }
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const linked = extractLinkedIds(template.sections, values);

      // Ensure top-level equipmentId is included in linkedEquipmentIds
      if (equipmentId) {
        const eqIds = new Set(linked.linkedEquipmentIds ?? []);
        eqIds.add(equipmentId);
        linked.linkedEquipmentIds = Array.from(eqIds);
      }

      if (existingSubmission) {
        await update(existingSubmission.id, JSON.parse(JSON.stringify({
          values,
          projectId: projectId || undefined,
          equipmentId: equipmentId || undefined,
          status: "submitted",
          updatedAt: now,
          category: template.category,
          ...linked,
        })));
      } else {
        const submission = JSON.parse(JSON.stringify({
          id: `sub-${crypto.randomUUID().slice(0, 10)}`,
          templateId: template.id,
          templateName: template.name,
          projectId: projectId || undefined,
          equipmentId: equipmentId || undefined,
          submittedById: user?.uid || "",
          submittedByName: employee?.name || "Unknown",
          status: "submitted",
          values,
          date: now.slice(0, 10),
          createdAt: now,
          updatedAt: now,
          category: template.category,
          ...linked,
        })) as FormSubmission;
        await add(submission);
      }
      toast.success("Form saved!");
      setSaved(true);
    } catch {
      toast.error("Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  const buildPdfOpts = () => {
    const proj = projectId ? projects.find((p) => p.id === projectId) : undefined;
    const equip = equipmentId ? equipment.find((e) => e.id === equipmentId) : undefined;
    const projectAddress = proj
      ? [proj.address, proj.city, proj.province].filter(Boolean).join(", ")
      : undefined;
    const sourceLabelMap: Record<string, Record<string, string>> = {
      employees: Object.fromEntries(employees.map((e) => [e.id, e.name])),
      projects: Object.fromEntries(projects.map((p) => [p.id, p.name])),
      equipment: Object.fromEntries(
        equipment
          .filter((e) => e.id !== EQUIPMENT_NONE_ID)
          .map((e) => [e.id, e.number ? `${e.name} #${e.number}` : e.name])
      ),
      attachments: Object.fromEntries(
        attachments.map((a) => [a.id, a.number ? `${a.name} #${a.number}` : a.name])
      ),
      tools: Object.fromEntries(
        tools.map((t) => [t.id, t.number ? `${t.name} #${t.number}` : t.name])
      ),
    };
    return {
      name: template.name,
      description: template.description,
      sections: template.sections,
      values,
      requireSignature: template.requireSignature,
      company,
      sourceLabelMap,
      projectName: proj?.name,
      projectAddress,
      equipmentName: equip ? (equip.number ? `${equip.name} #${equip.number}` : equip.name) : undefined,
    };
  };

  const handleSharePDF = () => {
    const safeName = (template.name || "form").replace(/[^a-zA-Z0-9-_]/g, "_");
    sharePDF(
      () => generateFormSubmissionPDFBlobUrl(buildPdfOpts()),
      `${safeName}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
    );
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div>
          <h2 className="text-xl font-bold">Form Saved!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {template.name} has been submitted successfully.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="gap-2 cursor-pointer"
            onClick={handleSharePDF}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share PDF
          </Button>
          <Button className="cursor-pointer" onClick={onBack}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-36">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{template.name}</h2>
          {template.description && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
        </div>
      </div>

      {/* Project Selector */}
      {template.requireProject && (
        <div className="mb-4">
          <Label className="text-xs font-medium">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {projects
                .filter((p) => p.status === "active")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Equipment Selector */}
      {template.requireEquipment && (
        <div className="mb-4">
          <Label className="text-xs font-medium">Equipment</Label>
          <Select value={equipmentId} onValueChange={setEquipmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select equipment…" />
            </SelectTrigger>
            <SelectContent>
              {equipment
                .filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID)
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.number ? `${e.name} #${e.number}` : e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sections & Fields */}
      <div className="space-y-6">
        {template.sections.map((section) =>
          section.repeatable ? (
            <RepeatableSection
              key={section.id}
              section={section}
              entries={(values[`__repeatable_${section.id}`] as Record<string, unknown>[] | undefined) ?? [{}]}
              onChange={(entries) => setValue(`__repeatable_${section.id}`, entries)}
              getFieldOptions={getFieldOptions}
            />
          ) : (
            <div key={section.id} className="space-y-4">
              {section.title && (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </h3>
                  <Separator />
                </>
              )}

              <div className="space-y-4">
                {section.fields.map((field) => {
                  if (!isFieldVisible(field, values)) return null;

                  if (field.type === "section-header") {
                    return (
                      <div key={field.id} className="pt-2">
                        <h4 className="text-sm font-bold">{field.label}</h4>
                      </div>
                    );
                  }

                  if (field.type === "label") {
                    return (
                      <p key={field.id} className="text-sm text-muted-foreground">
                        {field.label}
                      </p>
                    );
                  }

                  if (field.type === "weather") {
                    return (
                      <div key={field.id}>
                        <Label className="text-xs font-medium mb-1 block">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <WeatherField
                          value={values[field.id]}
                          onChange={(v) => setValue(field.id, v)}
                          projectId={projectId}
                          projects={projects}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field.id}
                      className={field.width === "half" ? "w-1/2 inline-block pr-2 align-top" : ""}
                    >
                      <Label className="text-xs font-medium mb-1 block">
                        {field.label}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      <RenderField
                        field={field}
                        value={values[field.id]}
                        onChange={(v) => setValue(field.id, v)}
                        resolvedOptions={getFieldOptions(field)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Submit Footer */}
      <div className="fixed bottom-20 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3 safe-area-bottom z-40">
        <div className="max-w-md mx-auto">
          <Button
            className="w-full gap-1.5 cursor-pointer"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Form"}
          </Button>
        </div>
      </div>
    </div>
  );
}
