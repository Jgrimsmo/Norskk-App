"use client";

import * as React from "react";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Truck,
  Undo2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Section, Field } from "@/components/shared/detail-helpers";
import { PdfUploadZone } from "@/components/shared/pdf-upload-zone";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { uploadFile, deleteFile } from "@/lib/firebase/storage";
import { useFormSubmissions, useFormTemplates } from "@/hooks/use-firestore";
import { SubmissionDetailDialog } from "@/components/shared/submission-detail-dialog";
import type { Equipment, ServiceHistoryEntry, FormSubmission } from "@/lib/types/time-tracking";

// ── Status colours (matching table) ──

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  "in-use": "bg-blue-100 text-blue-800 border-blue-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  rental: "bg-purple-100 text-purple-800 border-purple-200",
  retired: "bg-gray-100 text-gray-500 border-gray-200",
};

// ── Component ──

interface EquipmentDetailSheetProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Equipment>) => void;
}

export function EquipmentDetailSheet({
  equipment,
  open,
  onOpenChange,
  onUpdate,
}: EquipmentDetailSheetProps) {
  const { data: formSubmissions } = useFormSubmissions();
  const { data: formTemplates } = useFormTemplates();
  const [draft, setDraft] = React.useState<Equipment | null>(null);
  const [viewingSub, setViewingSub] = React.useState<FormSubmission | null>(null);

  const templateMap = React.useMemo(() => {
    const m = new Map<string, (typeof formTemplates)[number]>();
    for (const t of formTemplates) m.set(t.id, t);
    return m;
  }, [formTemplates]);

  // PDF uploading flags
  const [uploadingManual, setUploadingManual] = React.useState(false);
  const [uploadingSales, setUploadingSales] = React.useState(false);

  React.useEffect(() => {
    if (equipment && open) {
      setDraft({ ...equipment, serviceHistory: equipment.serviceHistory ? [...equipment.serviceHistory] : [] });
    }
  }, [equipment, open]);

  const isDirty = React.useMemo(() => {
    if (!draft || !equipment) return false;
    return JSON.stringify(draft) !== JSON.stringify(equipment);
  }, [draft, equipment]);

  const localUpdate = React.useCallback(
    (field: keyof Equipment, value: unknown) => {
      setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const handleSave = () => {
    if (!draft || !equipment) return;
    onUpdate(equipment.id, draft);
    onOpenChange(false);
  };

  const handleDiscard = () => {
    if (equipment) setDraft({ ...equipment, serviceHistory: equipment.serviceHistory ? [...equipment.serviceHistory] : [] });
  };

  // ── PDF upload helpers ──

  const handleDocUpload = async (
    file: File,
    docType: "operatorsManual" | "salesAgreement"
  ) => {
    if (!equipment) return;
    const setUploading = docType === "operatorsManual" ? setUploadingManual : setUploadingSales;
    setUploading(true);
    try {
      const path = `equipment-documents/${equipment.id}/${docType}/${file.name}`;
      const url = await uploadFile(file, path);
      const urlField = docType === "operatorsManual" ? "operatorsManualUrl" : "salesAgreementUrl";
      const nameField = docType === "operatorsManual" ? "operatorsManualName" : "salesAgreementName";
      // Persist immediately (not just draft) because files are already in storage
      onUpdate(equipment.id, { [urlField]: url, [nameField]: file.name });
      setDraft((prev) =>
        prev ? { ...prev, [urlField]: url, [nameField]: file.name } : prev
      );
      toast.success(`${docType === "operatorsManual" ? "Operators manual" : "Sales agreement"} uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDocRemove = async (docType: "operatorsManual" | "salesAgreement") => {
    if (!equipment) return;
    const urlField = docType === "operatorsManual" ? "operatorsManualUrl" : "salesAgreementUrl";
    const nameField = docType === "operatorsManual" ? "operatorsManualName" : "salesAgreementName";
    const currentName =
      docType === "operatorsManual"
        ? draft?.operatorsManualName || equipment.operatorsManualName
        : draft?.salesAgreementName || equipment.salesAgreementName;
    if (currentName) {
      const path = `equipment-documents/${equipment.id}/${docType}/${currentName}`;
      deleteFile(path).catch(() => {});
    }
    onUpdate(equipment.id, { [urlField]: "", [nameField]: "" });
    setDraft((prev) =>
      prev ? { ...prev, [urlField]: "", [nameField]: "" } : prev
    );
  };

  // ── Service history helpers ──

  const addServiceEntry = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const entry: ServiceHistoryEntry = {
        id: `sh-${crypto.randomUUID().slice(0, 8)}`,
        date: new Date().toISOString().slice(0, 10),
        hours: "",
      };
      return { ...prev, serviceHistory: [...(prev.serviceHistory || []), entry] };
    });
  };

  const updateServiceEntry = (id: string, field: keyof ServiceHistoryEntry, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        serviceHistory: (prev.serviceHistory || []).map((e) =>
          e.id === id ? { ...e, [field]: value } : e
        ),
      };
    });
  };

  const removeServiceEntry = (id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        serviceHistory: (prev.serviceHistory || []).filter((e) => e.id !== id),
      };
    });
  };

  if (!equipment || !draft) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full flex flex-col overflow-hidden"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-muted-foreground" />
            {draft.name || equipment.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {draft.number && (
              <span className="text-xs font-medium">{draft.number}</span>
            )}
            {draft.category && (
              <Badge variant="outline" className="text-[10px]">
                {draft.category}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] capitalize ${
                statusColors[draft.status] || statusColors.available
              }`}
            >
              {draft.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mb-2">
            <TabsTrigger value="details" className="text-xs cursor-pointer">Details</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs cursor-pointer">Documents</TabsTrigger>
            <TabsTrigger value="service" className="text-xs cursor-pointer">Service</TabsTrigger>
            <TabsTrigger value="inspections" className="text-xs cursor-pointer">Inspections</TabsTrigger>
          </TabsList>

          {/* ── Details tab ── */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 pt-2 mt-0">
            <Section icon={Truck} title="Specifications">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Year">
                  <Input
                    value={draft.year || ""}
                    onChange={(e) => localUpdate("year", e.target.value)}
                    placeholder="e.g. 2021"
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Brand">
                  <Input
                    value={draft.brand || ""}
                    onChange={(e) => localUpdate("brand", e.target.value)}
                    placeholder="e.g. CAT, Komatsu"
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Model">
                  <Input
                    value={draft.model || ""}
                    onChange={(e) => localUpdate("model", e.target.value)}
                    placeholder="e.g. 320 GC"
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Weight">
                  <Input
                    value={draft.weight || ""}
                    onChange={(e) => localUpdate("weight", e.target.value)}
                    placeholder="e.g. 22,000 kg"
                    className="h-8 text-xs"
                  />
                </Field>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Notes">
              <Textarea
                value={draft.notes || ""}
                onChange={(e) => localUpdate("notes", e.target.value)}
                placeholder="Add any notes about this equipment..."
                className="min-h-[120px] text-xs"
              />
            </Section>
          </TabsContent>

          {/* ── Documents tab ── */}
          <TabsContent value="documents" className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 pt-2 mt-0">
            <Section icon={FileText} title="Operators Manual">
              <PdfUploadZone
                fileUrl={draft.operatorsManualUrl}
                fileName={draft.operatorsManualName}
                isUploading={uploadingManual}
                onFileSelect={(f) => handleDocUpload(f, "operatorsManual")}
                onRemoveFile={() => handleDocRemove("operatorsManual")}
              />
            </Section>

            <Section icon={FileText} title="Sales Agreement">
              <PdfUploadZone
                fileUrl={draft.salesAgreementUrl}
                fileName={draft.salesAgreementName}
                isUploading={uploadingSales}
                onFileSelect={(f) => handleDocUpload(f, "salesAgreement")}
                onRemoveFile={() => handleDocRemove("salesAgreement")}
              />
            </Section>
          </TabsContent>

          {/* ── Service History tab ── */}
          <TabsContent value="service" className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 pt-2 mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  Service History
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 cursor-pointer"
                  onClick={addServiceEntry}
                >
                  <Plus className="h-3 w-3" />
                  Add Entry
                </Button>
              </div>

              {(!draft.serviceHistory || draft.serviceHistory.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No service history recorded yet.
                </p>
              )}

              {(draft.serviceHistory || []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-2 sm:grid-cols-2 flex-1">
                      <Field label="Date">
                        <Input
                          type="date"
                          value={entry.date}
                          onChange={(e) =>
                            updateServiceEntry(entry.id, "date", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </Field>
                      <Field label="Hours at Service">
                        <Input
                          value={entry.hours}
                          onChange={(e) => {
                            if (/^\d*\.?\d*$/.test(e.target.value))
                              updateServiceEntry(entry.id, "hours", e.target.value);
                          }}
                          placeholder="e.g. 5000"
                          inputMode="decimal"
                          className="h-8 text-xs"
                        />
                      </Field>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 cursor-pointer shrink-0 mt-4"
                      onClick={() => removeServiceEntry(entry.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Field label="Service Notes">
                    <Textarea
                      value={entry.notes || ""}
                      onChange={(e) =>
                        updateServiceEntry(entry.id, "notes", e.target.value)
                      }
                      placeholder="What was serviced..."
                      className="min-h-[60px] text-xs"
                    />
                  </Field>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Inspections tab ── */}
          <TabsContent value="inspections" className="flex-1 overflow-y-auto px-4 pb-4 pt-2 mt-0">
            {(() => {
              const linked = equipment
                ? formSubmissions.filter((fs) =>
                    fs.linkedEquipmentIds?.includes(equipment.id) || fs.equipmentId === equipment.id
                  ).sort((a, b) => b.date.localeCompare(a.date))
                : [];
              if (linked.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                    <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      No Inspections Yet
                    </h3>
                    <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                      Forms linked to this equipment will appear here automatically.
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {linked.map((fs) => (
                    <button
                      key={fs.id}
                      onClick={() => setViewingSub(fs)}
                      className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{fs.templateName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fs.date} · {fs.submittedByName}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ml-2 ${
                        fs.status === "submitted" ? "border-blue-300 text-blue-700"
                          : fs.status === "reviewed" ? "border-green-300 text-green-700"
                          : ""
                      }`}>
                        {fs.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        <SheetFooter className="border-t px-4 py-3">
          <div className="flex items-center justify-between w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 cursor-pointer"
              onClick={handleDiscard}
              disabled={!isDirty}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Discard Changes
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5 cursor-pointer"
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {viewingSub && (
      <SubmissionDetailDialog
        submission={viewingSub}
        template={templateMap.get(viewingSub.templateId)}
        open={!!viewingSub}
        onClose={() => setViewingSub(null)}
      />
    )}
    </>
  );
}




