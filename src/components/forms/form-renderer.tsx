"use client";

import * as React from "react";
import { ArrowLeft, Loader2, Save, Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  FormSubmission,
} from "@/lib/types/time-tracking";
import { useFormSubmissions, useProjects } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCurrentEmployee } from "@/hooks/use-current-employee";

// ── Conditional visibility check ──
function isFieldVisible(
  field: FormField,
  values: Record<string, unknown>
): boolean {
  if (!field.conditional) return true;
  const { fieldId, operator, value } = field.conditional;
  const actual = String(values[fieldId] ?? "");
  switch (operator) {
    case "equals":
      return actual === value;
    case "not-equals":
      return actual !== value;
    case "contains":
      return actual.toLowerCase().includes(value.toLowerCase());
    default:
      return true;
  }
}

// ── Individual field renderer ──
function RenderField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "textarea":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const checked = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked.includes(opt.value)}
                onCheckedChange={(c) => {
                  onChange(
                    c
                      ? [...checked, opt.value]
                      : checked.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-primary"
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true || value === "true" || value === "yes"}
            onCheckedChange={(v: boolean) => onChange(v)}
          />
          <span className="text-sm text-muted-foreground">
            {value === true || value === "true" || value === "yes" ? "Yes" : "No"}
          </span>
        </div>
      );

    case "photo": {
      const photos = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Camera className="h-3.5 w-3.5" />
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    onChange([...photos, reader.result]);
                  }
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      );
    }

    case "signature":
      return (
        <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
          {value ? (
            <div className="space-y-2">
              <img src={String(value)} alt="Signature" className="max-h-24 mx-auto" />
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => onChange("")}
              >
                Clear Signature
              </Button>
            </div>
          ) : (
            <p>Signature capture will be available on submit.</p>
          )}
        </div>
      );

    case "section-header":
      return null; // rendered separately

    case "label":
      return null; // rendered as text only

    default:
      return <p className="text-xs text-muted-foreground">Unsupported field type</p>;
  }
}

// ── Main Form Renderer ──
interface FormRendererProps {
  template: FormTemplate;
  existingSubmission?: FormSubmission;
  onBack: () => void;
}

export function FormRenderer({ template, existingSubmission, onBack }: FormRendererProps) {
  const { user } = useAuth();
  const { employee } = useCurrentEmployee();
  const { data: projects } = useProjects();
  const { add, update } = useFormSubmissions();
  const [saving, setSaving] = React.useState(false);

  const [values, setValues] = React.useState<Record<string, unknown>>(
    existingSubmission?.values || {}
  );
  const [projectId, setProjectId] = React.useState(existingSubmission?.projectId || "");

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validate = (): string | null => {
    if (template.requireProject && !projectId) {
      return "Please select a project.";
    }
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (!isFieldVisible(field, values)) continue;
        if (!field.required) continue;
        const v = values[field.id];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          return `"${field.label}" is required.`;
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
      if (existingSubmission) {
        await update(existingSubmission.id, {
          values,
          projectId,
          status: "submitted",
          updatedAt: now,
        });
      } else {
        const submission: FormSubmission = {
          id: `sub-${crypto.randomUUID().slice(0, 10)}`,
          templateId: template.id,
          templateName: template.name,
          projectId,
          submittedById: user?.uid || "",
          submittedByName: employee?.name || "Unknown",
          status: "submitted",
          values,
          date: now.slice(0, 10),
          createdAt: now,
          updatedAt: now,
        };
        await add(submission);
      }
      toast.success("Form submitted!");
      onBack();
    } catch {
      toast.error("Failed to submit form.");
    } finally {
      setSaving(false);
    }
  };

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

      {/* Sections & Fields */}
      <div className="space-y-6">
        {template.sections.map((section) => (
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
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Footer */}
      <div className="fixed bottom-20 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3 safe-area-bottom z-40">
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
          {saving ? "Submitting…" : "Submit Form"}
        </Button>
      </div>
    </div>
  );
}
