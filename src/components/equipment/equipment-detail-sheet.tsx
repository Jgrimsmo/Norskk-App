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
  Upload,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { uploadFile, deleteFile } from "@/lib/firebase/storage";
import type { Equipment, ServiceHistoryEntry } from "@/lib/types/time-tracking";

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
  const [draft, setDraft] = React.useState<Equipment | null>(null);

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

          {/* ── Inspections tab (future) ── */}
          <TabsContent value="inspections" className="flex-1 overflow-y-auto px-4 pb-4 pt-2 mt-0">
            <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-muted-foreground">
                Inspections — Coming Soon
              </h3>
              <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                Equipment inspection forms and history will appear here in a future update.
              </p>
            </div>
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
  );
}

// ── PDF upload/display zone ──

function PdfUploadZone({
  fileUrl,
  fileName,
  isUploading,
  onFileSelect,
  onRemoveFile,
}: {
  fileUrl?: string;
  fileName?: string;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (fileUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <FileText className="h-4 w-4 text-red-500 shrink-0" />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate flex-1"
        >
          {fileName || "View PDF"}
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-red-600 cursor-pointer shrink-0"
          onClick={onRemoveFile}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-4 transition-colors cursor-pointer ${
        dragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      {isUploading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Uploading...</span>
        </>
      ) : (
        <>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            Drop PDF here or click to browse
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            Max 20 MB
          </span>
        </>
      )}
    </div>
  );
}

// ── Shared layout helpers ──

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
