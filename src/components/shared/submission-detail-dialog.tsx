"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  useEmployees,
  useEquipment,
  useAttachments,
  useTools,
  useProjects,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import type {
  FormSubmission,
  FormTemplate,
  FormField,
  FormFieldOption,
  FormFieldOptionsSource,
} from "@/lib/types/time-tracking";

export function SubmissionDetailDialog({
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
    if (field.type === "weather" && typeof value === "object" && value !== null) {
      const w = value as Record<string, unknown>;
      const parts = Object.entries(w)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v)));
      return parts.join(" · ") || <span className="text-muted-foreground">—</span>;
    }
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
