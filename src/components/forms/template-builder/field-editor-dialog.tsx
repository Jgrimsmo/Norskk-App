"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

import type { FormField, FormFieldOptionsSource } from "@/lib/types/forms";
import { OPTIONS_SOURCES, uid } from "./constants";

interface FieldEditorDialogProps {
  field: FormField;
  allFields: FormField[];
  open: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
}

export function FieldEditorDialog({
  field,
  allFields,
  open,
  onClose,
  onSave,
}: FieldEditorDialogProps) {
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
