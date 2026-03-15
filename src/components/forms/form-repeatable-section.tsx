"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type { FormField, FormFieldOption, FormSection } from "@/lib/types/time-tracking";
import { isFieldVisible } from "./form-utils";
import { RenderField } from "./form-field-renderer";

export function RepeatableSection({
  section,
  entries,
  onChange,
  getFieldOptions,
}: {
  section: FormSection;
  entries: Record<string, unknown>[];
  onChange: (entries: Record<string, unknown>[]) => void;
  getFieldOptions: (field: FormField) => FormFieldOption[] | undefined;
}) {
  const addEntry = () => onChange([...entries, {}]);
  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [{}]);
  };
  const updateEntry = (idx: number, fieldId: string, value: unknown) => {
    onChange(entries.map((e, i) => (i === idx ? { ...e, [fieldId]: value } : e)));
  };

  return (
    <div className="space-y-4">
      {section.title && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title} ({entries.length})
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1 cursor-pointer"
              onClick={addEntry}
            >
              <Plus className="h-3 w-3" /> Add Entry
            </Button>
          </div>
          <Separator />
        </>
      )}

      {entries.map((entry, eIdx) => (
        <div key={eIdx} className="rounded-lg border p-3 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              #{eIdx + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive cursor-pointer"
              onClick={() => removeEntry(eIdx)}
              disabled={entries.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-3">
            {section.fields.map((field) => {
              if (!isFieldVisible(field, entry)) return null;

              if (field.type === "section-header") {
                return (
                  <div key={field.id} className="pt-1">
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
                    value={entry[field.id]}
                    onChange={(v) => updateEntry(eIdx, field.id, v)}
                    resolvedOptions={getFieldOptions(field)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!section.title && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1 cursor-pointer"
          onClick={addEntry}
        >
          <Plus className="h-3 w-3" /> Add Entry
        </Button>
      )}
    </div>
  );
}
