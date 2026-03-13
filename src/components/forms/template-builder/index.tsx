"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import type { FormSection, FormField, FormFieldType } from "@/lib/types/forms";
import { useFormTemplates } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";

import {
  CATEGORIES,
  uid,
  stripUndefined,
  createBlankField,
  createBlankSection,
} from "./constants";
import { FieldEditorDialog } from "./field-editor-dialog";
import { FieldCard } from "./field-card";
import { AddFieldPalette } from "./add-field-palette";
import { FormPreviewDialog } from "./form-preview-dialog";

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
