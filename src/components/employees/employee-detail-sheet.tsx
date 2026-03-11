"use client";

import * as React from "react";
import {
  CalendarDays,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  UserRound,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Employee, Certificate } from "@/lib/types/time-tracking";
import { uploadFile, deleteFile } from "@/lib/firebase/storage";
import { toast } from "sonner";

// ── Helpers ──

function certStatus(cert: Certificate): "valid" | "expiring" | "expired" | "unknown" {
  if (!cert.expiryDate) return "unknown";
  const expiry = new Date(cert.expiryDate);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (expiry.getTime() < now.getTime()) return "expired";
  if (expiry.getTime() - now.getTime() < thirtyDays) return "expiring";
  return "valid";
}

const certStatusColors: Record<string, string> = {
  valid: "bg-green-100 text-green-800 border-green-200",
  expiring: "bg-yellow-100 text-yellow-800 border-yellow-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  unknown: "bg-gray-100 text-gray-600 border-gray-200",
};

const certStatusLabels: Record<string, string> = {
  valid: "Valid",
  expiring: "Expiring Soon",
  expired: "Expired",
  unknown: "No Expiry",
};

// ── Component ──

interface EmployeeDetailSheetProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}

export function EmployeeDetailSheet({
  employee,
  open,
  onOpenChange,
  onUpdate,
}: EmployeeDetailSheetProps) {
  // Local draft — changes are buffered here until Save is clicked
  const [draft, setDraft] = React.useState<Employee | null>(null);

  // Reset draft whenever a new employee is opened
  React.useEffect(() => {
    if (employee && open) {
      setDraft({ ...employee });
    }
  }, [employee, open]);

  const isDirty = React.useMemo(() => {
    if (!draft || !employee) return false;
    return JSON.stringify(draft) !== JSON.stringify(employee);
  }, [draft, employee]);

  const localUpdate = React.useCallback(
    (_id: string, patch: Partial<Employee>) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    []
  );

  const handleSave = () => {
    if (!draft || !employee) return;
    onUpdate(employee.id, draft);
    onOpenChange(false);
  };

  const handleDiscard = () => {
    if (employee) setDraft({ ...employee });
  };

  if (!employee || !draft) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full flex flex-col overflow-hidden"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            {draft.name || employee.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {draft.role && (
              <span className="text-xs">{draft.role}</span>
            )}
            {(draft.permissionLevel || employee.permissionLevel) && (
              <Badge variant="outline" className="text-[10px]">
                {draft.permissionLevel || employee.permissionLevel}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] capitalize ${
                (draft.status || employee.status) === "active"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {draft.status || employee.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <Tabs defaultValue="overview">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="text-xs flex-1 cursor-pointer">
                Overview
              </TabsTrigger>
              <TabsTrigger value="compensation" className="text-xs flex-1 cursor-pointer">
                Compensation
              </TabsTrigger>
              <TabsTrigger value="certificates" className="text-xs flex-1 cursor-pointer">
                Certificates
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs flex-1 cursor-pointer">
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab employee={draft} onUpdate={localUpdate} />
            </TabsContent>
            <TabsContent value="compensation">
              <CompensationTab employee={draft} onUpdate={localUpdate} />
            </TabsContent>
            <TabsContent value="certificates">
              <CertificatesTab employee={draft} onUpdate={localUpdate} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab employee={draft} onUpdate={localUpdate} />
            </TabsContent>
          </Tabs>
        </div>

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

// ────────────────────────────────────────
// Overview Tab
// ────────────────────────────────────────

function OverviewTab({
  employee,
  onUpdate,
}: {
  employee: Employee;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  return (
    <div className="space-y-6 pt-4">
      {/* Employment */}
      <Section icon={CalendarDays} title="Employment">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hire Date">
            <Input
              type="date"
              value={employee.hireDate || ""}
              onChange={(e) =>
                onUpdate(employee.id, { hireDate: e.target.value })
              }
              className="h-8 text-xs"
            />
          </Field>
        </div>
      </Section>

      {/* Contact */}
      <Section icon={UserRound} title="Contact Info">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <Input
              value={employee.phone || ""}
              onChange={(e) =>
                onUpdate(employee.id, { phone: e.target.value })
              }
              placeholder="(555) 000-0000"
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Email">
            <Input
              value={employee.email || ""}
              onChange={(e) =>
                onUpdate(employee.id, { email: e.target.value })
              }
              placeholder="email@company.com"
              className="h-8 text-xs"
            />
          </Field>
        </div>
      </Section>

      {/* Emergency Contact */}
      <Section icon={ShieldCheck} title="Emergency Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={employee.emergencyContactName || ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  emergencyContactName: e.target.value,
                })
              }
              placeholder="Full name"
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={employee.emergencyContactPhone || ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  emergencyContactPhone: e.target.value,
                })
              }
              placeholder="(555) 000-0000"
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Relationship">
            <Input
              value={employee.emergencyContactRelation || ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  emergencyContactRelation: e.target.value,
                })
              }
              placeholder="e.g. Spouse, Parent"
              className="h-8 text-xs"
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ────────────────────────────────────────
// Compensation Tab
// ────────────────────────────────────────

function CompensationTab({
  employee,
  onUpdate,
}: {
  employee: Employee;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  return (
    <div className="space-y-6 pt-4">
      <Section icon={DollarSign} title="Current Compensation">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Current Wage ($)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={employee.currentWage ?? ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  currentWage: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Wage Type">
            <Select
              value={employee.wageType || ""}
              onValueChange={(v) =>
                onUpdate(employee.id, {
                  wageType: v as "hourly" | "salary",
                })
              }
            >
              <SelectTrigger className="h-8 text-xs cursor-pointer">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly" className="text-xs">
                  Hourly
                </SelectItem>
                <SelectItem value="salary" className="text-xs">
                  Salary
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Last Increase Date">
            <Input
              type="date"
              value={employee.lastIncreaseDate || ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  lastIncreaseDate: e.target.value || undefined,
                })
              }
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Last Increase ($)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={employee.lastIncreaseAmount ?? ""}
              onChange={(e) =>
                onUpdate(employee.id, {
                  lastIncreaseAmount: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </Field>
        </div>
      </Section>

      {/* Wage History */}
      <Section icon={CalendarDays} title="Wage History">
        {(!employee.wageHistory || employee.wageHistory.length === 0) ? (
          <p className="text-xs text-muted-foreground py-2">
            No wage history recorded yet. Changes will appear here when wage or increase fields are updated.
          </p>
        ) : (
          <div className="space-y-2">
            {employee.wageHistory.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">
                    ${entry.amount.toFixed(2)}
                  </p>
                  {entry.note && (
                    <p className="text-[10px] text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {entry.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ────────────────────────────────────────
// Certificates Tab
// ────────────────────────────────────────

function CertificatesTab({
  employee,
  onUpdate,
}: {
  employee: Employee;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  const certs = employee.certificates || [];
  const [uploadingCertId, setUploadingCertId] = React.useState<string | null>(null);

  const addCert = () => {
    const newCert: Certificate = {
      id: crypto.randomUUID().slice(0, 8),
      name: "",
    };
    onUpdate(employee.id, { certificates: [...certs, newCert] });
  };

  const updateCert = (certId: string, patch: Partial<Certificate>) => {
    onUpdate(employee.id, {
      certificates: certs.map((c) =>
        c.id === certId ? { ...c, ...patch } : c
      ),
    });
  };

  const removeCert = (certId: string) => {
    const cert = certs.find((c) => c.id === certId);
    if (cert?.fileUrl) {
      const path = `employee-certificates/${employee.id}/${certId}`;
      deleteFile(path).catch(() => {});
    }
    onUpdate(employee.id, {
      certificates: certs.filter((c) => c.id !== certId),
    });
  };

  const handleFileUpload = async (certId: string, file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }

    setUploadingCertId(certId);
    try {
      const path = `employee-certificates/${employee.id}/${certId}/${file.name}`;
      const url = await uploadFile(file, path);
      updateCert(certId, { fileUrl: url, fileName: file.name });
      toast.success("PDF uploaded");
    } catch {
      toast.error("Failed to upload PDF");
    } finally {
      setUploadingCertId(null);
    }
  };

  const removeFile = (certId: string) => {
    const path = `employee-certificates/${employee.id}/${certId}`;
    deleteFile(path).catch(() => {});
    updateCert(certId, { fileUrl: undefined, fileName: undefined });
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {certs.length} certificate{certs.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 cursor-pointer"
          onClick={addCert}
        >
          <Plus className="h-3 w-3" />
          Add Certificate
        </Button>
      </div>

      {certs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <ShieldCheck className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">No certificates</p>
          <p className="text-xs">Add certificates to track expiry dates.</p>
        </div>
      )}

      {certs.map((cert) => {
        const status = certStatus(cert);
        const isUploading = uploadingCertId === cert.id;
        return (
          <div
            key={cert.id}
            className="rounded-lg border p-3 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <Field label="Certificate Name">
                  <Input
                    value={cert.name}
                    onChange={(e) =>
                      updateCert(cert.id, { name: e.target.value })
                    }
                    placeholder="e.g. First Aid, CSTS"
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Certificate #">
                  <Input
                    value={cert.certificateNumber || ""}
                    onChange={(e) =>
                      updateCert(cert.id, {
                        certificateNumber: e.target.value,
                      })
                    }
                    placeholder="Optional"
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Issue Date">
                  <Input
                    type="date"
                    value={cert.issueDate || ""}
                    onChange={(e) =>
                      updateCert(cert.id, {
                        issueDate: e.target.value || undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </Field>
                <Field label="Expiry Date">
                  <div className="space-y-1">
                    <Input
                      type="date"
                      value={cert.expiryDate || ""}
                      onChange={(e) =>
                        updateCert(cert.id, {
                          expiryDate: e.target.value || undefined,
                        })
                      }
                      className="h-8 text-xs"
                    />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${certStatusColors[status]}`}
                    >
                      {certStatusLabels[status]}
                    </Badge>
                  </div>
                </Field>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600 cursor-pointer shrink-0 mt-5"
                onClick={() => removeCert(cert.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* PDF Upload */}
            <CertPdfUpload
              cert={cert}
              isUploading={isUploading}
              onFileSelect={(file) => handleFileUpload(cert.id, file)}
              onRemoveFile={() => removeFile(cert.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Certificate PDF drop zone ──

function CertPdfUpload({
  cert,
  isUploading,
  onFileSelect,
  onRemoveFile,
}: {
  cert: Certificate;
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

  if (cert.fileUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <FileText className="h-4 w-4 text-red-500 shrink-0" />
        <a
          href={cert.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate flex-1"
        >
          {cert.fileName || "View PDF"}
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
            Max 10 MB
          </span>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Notes Tab
// ────────────────────────────────────────

function NotesTab({
  employee,
  onUpdate,
}: {
  employee: Employee;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  return (
    <div className="pt-4 space-y-2">
      <Label className="text-xs text-muted-foreground">Notes</Label>
      <Textarea
        value={employee.notes || ""}
        onChange={(e) => onUpdate(employee.id, { notes: e.target.value })}
        placeholder="Add any notes about this employee..."
        className="min-h-[200px] text-xs"
      />
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
