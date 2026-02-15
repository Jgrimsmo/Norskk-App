"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  HardHat,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";

import { SignaturePad } from "@/components/safety/signature-pad";

import {
  type SafetyForm,
  type FLHAData,
  type HazardItem,
  type HazardRating,
  type PPEItem,
  type CheckValue,
  type CrewMember,
} from "@/lib/types/time-tracking";
import { useEmployees, useProjects } from "@/hooks/use-firestore";
import { defaultHazards, defaultPPE } from "@/lib/data/flha-defaults";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const ratingColors: Record<HazardRating, string> = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-red-100 text-red-800 border-red-300",
  na: "bg-gray-100 text-gray-500 border-gray-200",
};

const checkLabels: Record<CheckValue, string> = {
  yes: "Yes",
  no: "No",
  na: "N/A",
};

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

// ────────────────────────────────────────────
// Section header
// ────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  number,
  title,
}: {
  icon: React.ElementType;
  number: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        Section {number} — {title}
      </h3>
    </div>
  );
}

// ────────────────────────────────────────────
// Main dialog component
// ────────────────────────────────────────────

interface FLHAFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SafetyForm;
  onSave: (form: SafetyForm) => void;
}

export function FLHAFormDialog({
  open,
  onOpenChange,
  form,
  onSave,
}: FLHAFormDialogProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();

  // Initialize FLHA data with defaults if not present
  const [flha, setFlha] = React.useState<FLHAData>(() =>
    form.flha ?? {
      taskDescription: "",
      location: "",
      hazards: defaultHazards(),
      ppe: defaultPPE(),
      additionalControls: "",
      crewMembers: [],
      supervisorId: "",
      supervisorSignature: "",
    }
  );

  const [formMeta, setFormMeta] = React.useState({
    date: form.date,
    projectId: form.projectId,
    submittedById: form.submittedById,
    title: form.title,
    status: form.status,
  });

  // Reset when form changes (new dialog open)
  React.useEffect(() => {
    setFlha(
      form.flha ?? {
        taskDescription: "",
        location: "",
        hazards: defaultHazards(),
        ppe: defaultPPE(),
        additionalControls: "",
        crewMembers: [],
        supervisorId: "",
        supervisorSignature: "",
      }
    );
    setFormMeta({
      date: form.date,
      projectId: form.projectId,
      submittedById: form.submittedById,
      title: form.title,
      status: form.status,
    });
  }, [form]);

  const isClosed = form.status === "closed" || form.status === "reviewed";

  // Dirty-tracking for unsaved-changes warning
  const isDirty =
    JSON.stringify(flha) !== JSON.stringify(form.flha ?? {}) ||
    JSON.stringify(formMeta) !== JSON.stringify({
      date: form.date,
      projectId: form.projectId,
      submittedById: form.submittedById,
      title: form.title,
      status: form.status,
    });
  const { confirmClose } = useUnsavedWarning(isDirty && open);

  // ── Hazard updates ──
  const updateHazard = (id: string, field: keyof HazardItem, value: unknown) => {
    setFlha((prev) => ({
      ...prev,
      hazards: prev.hazards.map((h) =>
        h.id === id ? { ...h, [field]: value } : h
      ),
    }));
  };

  // ── PPE updates ──
  const updatePPE = (id: string, value: CheckValue) => {
    setFlha((prev) => ({
      ...prev,
      ppe: prev.ppe.map((p) =>
        p.id === id ? { ...p, required: value } : p
      ),
    }));
  };

  // ── Crew member management ──
  const addCrewMember = () => {
    setFlha((prev) => ({
      ...prev,
      crewMembers: [
        ...prev.crewMembers,
        { employeeId: "", signatureDataUrl: "" },
      ],
    }));
  };

  const updateCrewMember = (
    idx: number,
    field: keyof CrewMember,
    value: string
  ) => {
    setFlha((prev) => ({
      ...prev,
      crewMembers: prev.crewMembers.map((cm, i) =>
        i === idx ? { ...cm, [field]: value } : cm
      ),
    }));
  };

  const removeCrewMember = (idx: number) => {
    setFlha((prev) => ({
      ...prev,
      crewMembers: prev.crewMembers.filter((_, i) => i !== idx),
    }));
  };

  // ── Save ──
  const handleSave = () => {
    const updated: SafetyForm = {
      ...form,
      ...formMeta,
      description: flha.taskDescription,
      flha,
    };
    onSave(updated);
    onOpenChange(false);
  };

  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: `${p.number} — ${p.name}`,
  }));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: e.name,
  }));

  const hazardsByCategory = groupBy(flha.hazards, (h) => h.category);

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next && !confirmClose()) return;
      onOpenChange(next);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Field Level Hazard Assessment
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete all sections before work begins
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                formMeta.status === "draft"
                  ? "bg-gray-100 text-gray-700"
                  : formMeta.status === "submitted"
                    ? "bg-yellow-100 text-yellow-800"
                    : formMeta.status === "reviewed"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
              }`}
            >
              {formMeta.status}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-5 space-y-8">
            {/* ─── TOP META ─── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={formMeta.date}
                  onChange={(e) =>
                    setFormMeta((prev) => ({ ...prev, date: e.target.value }))
                  }
                  disabled={isClosed}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Project</Label>
                <Select
                  value={formMeta.projectId}
                  onValueChange={(v) =>
                    setFormMeta((prev) => ({ ...prev, projectId: v }))
                  }
                  disabled={isClosed}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Submitted By</Label>
                <Select
                  value={formMeta.submittedById}
                  onValueChange={(v) =>
                    setFormMeta((prev) => ({ ...prev, submittedById: v }))
                  }
                  disabled={isClosed}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {employeeOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-sm">
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Form Title</Label>
                <Input
                  value={formMeta.title}
                  onChange={(e) =>
                    setFormMeta((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isClosed}
                  placeholder="e.g. Morning FLHA — Foundation Pour"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* ─── SECTION 1: Job Information ─── */}
            <div>
              <SectionHeader
                icon={ClipboardCheck}
                number={1}
                title="Job Information"
              />
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Task / Job Description</Label>
                  <Textarea
                    value={flha.taskDescription}
                    onChange={(e) =>
                      setFlha((prev) => ({
                        ...prev,
                        taskDescription: e.target.value,
                      }))
                    }
                    disabled={isClosed}
                    placeholder="Describe the work to be performed..."
                    className="text-sm min-h-[60px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Specific Location / Area</Label>
                  <Input
                    value={flha.location}
                    onChange={(e) =>
                      setFlha((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    disabled={isClosed}
                    placeholder="e.g. Building A — 3rd Floor, South Side"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ─── SECTION 2: Hazard Identification ─── */}
            <div>
              <SectionHeader
                icon={AlertTriangle}
                number={2}
                title="Hazard Identification"
              />
              <p className="text-xs text-muted-foreground mb-4">
                Check each hazard present at the work site. Rate the risk and
                describe control measures for identified hazards.
              </p>

              <div className="space-y-5">
                {Object.entries(hazardsByCategory).map(
                  ([category, items]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      <div className="rounded-lg border overflow-hidden">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_auto_100px_1fr] gap-2 px-3 py-2 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          <span>Hazard</span>
                          <span className="w-[60px] text-center">Present</span>
                          <span className="text-center">Risk</span>
                          <span>Controls</span>
                        </div>
                        {items.map((hazard, idx) => (
                          <div
                            key={hazard.id}
                            className={`grid grid-cols-[1fr_auto_100px_1fr] gap-2 px-3 py-2 items-center ${idx > 0 ? "border-t" : ""}`}
                          >
                            <span className="text-xs text-foreground">
                              {hazard.hazard}
                            </span>
                            <div className="w-[60px] flex justify-center">
                              <Checkbox
                                checked={hazard.identified}
                                onCheckedChange={(v) =>
                                  updateHazard(
                                    hazard.id,
                                    "identified",
                                    Boolean(v)
                                  )
                                }
                                disabled={isClosed}
                                className="cursor-pointer"
                              />
                            </div>
                            <div className="flex justify-center">
                              {hazard.identified ? (
                                <Select
                                  value={hazard.rating}
                                  onValueChange={(v) =>
                                    updateHazard(
                                      hazard.id,
                                      "rating",
                                      v as HazardRating
                                    )
                                  }
                                  disabled={isClosed}
                                >
                                  <SelectTrigger className="h-7 w-[90px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent position="popper">
                                    <SelectItem
                                      value="low"
                                      className="text-xs"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${ratingColors.low}`}
                                      >
                                        Low
                                      </Badge>
                                    </SelectItem>
                                    <SelectItem
                                      value="medium"
                                      className="text-xs"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${ratingColors.medium}`}
                                      >
                                        Medium
                                      </Badge>
                                    </SelectItem>
                                    <SelectItem
                                      value="high"
                                      className="text-xs"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${ratingColors.high}`}
                                      >
                                        High
                                      </Badge>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                            <div>
                              {hazard.identified ? (
                                <Input
                                  value={hazard.controls}
                                  onChange={(e) =>
                                    updateHazard(
                                      hazard.id,
                                      "controls",
                                      e.target.value
                                    )
                                  }
                                  disabled={isClosed}
                                  placeholder="Control measures..."
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <Separator />

            {/* ─── SECTION 3: PPE Requirements ─── */}
            <div>
              <SectionHeader
                icon={HardHat}
                number={3}
                title="PPE Requirements"
              />
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>PPE Item</span>
                  <span className="w-[50px] text-center">Yes</span>
                  <span className="w-[50px] text-center">No</span>
                  <span className="w-[50px] text-center">N/A</span>
                </div>
                {flha.ppe.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 items-center ${idx > 0 ? "border-t" : ""}`}
                  >
                    <span className="text-xs text-foreground">{item.name}</span>
                    {(["yes", "no", "na"] as CheckValue[]).map((val) => (
                      <div key={val} className="w-[50px] flex justify-center">
                        <Checkbox
                          checked={item.required === val}
                          onCheckedChange={() => updatePPE(item.id, val)}
                          disabled={isClosed}
                          className="cursor-pointer rounded-full"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* ─── SECTION 4: Additional Controls ─── */}
            <div>
              <SectionHeader
                icon={ClipboardCheck}
                number={4}
                title="Additional Controls / Comments"
              />
              <Textarea
                value={flha.additionalControls}
                onChange={(e) =>
                  setFlha((prev) => ({
                    ...prev,
                    additionalControls: e.target.value,
                  }))
                }
                disabled={isClosed}
                placeholder="Any additional control measures, special instructions, or comments..."
                className="text-sm min-h-[80px] resize-none"
              />
            </div>

            <Separator />

            {/* ─── SECTION 5: Crew Acknowledgment ─── */}
            <div>
              <SectionHeader
                icon={Users}
                number={5}
                title="Crew Acknowledgment"
              />
              <p className="text-xs text-muted-foreground mb-4">
                Each crew member must be listed and sign to acknowledge they have
                reviewed this FLHA and understand the hazards and controls.
              </p>

              <div className="space-y-4">
                {flha.crewMembers.map((cm, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Crew Member {idx + 1}
                      </span>
                      {!isClosed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-600 cursor-pointer"
                          onClick={() => removeCrewMember(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Select
                      value={cm.employeeId}
                      onValueChange={(v) =>
                        updateCrewMember(idx, "employeeId", v)
                      }
                      disabled={isClosed}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select crew member..." />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {employeeOptions.map((e) => (
                          <SelectItem
                            key={e.id}
                            value={e.id}
                            className="text-sm"
                          >
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SignaturePad
                      label="Signature"
                      value={cm.signatureDataUrl}
                      onChange={(v) =>
                        updateCrewMember(idx, "signatureDataUrl", v)
                      }
                      disabled={isClosed}
                      storagePath={`safety/${form.id}/crew-${idx}-sig.png`}
                    />
                  </div>
                ))}

                {!isClosed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs cursor-pointer"
                    onClick={addCrewMember}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Crew Member
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* ─── SECTION 6: Supervisor Sign-Off ─── */}
            <div>
              <SectionHeader
                icon={ShieldCheck}
                number={6}
                title="Supervisor Sign-Off"
              />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Supervisor</Label>
                  <Select
                    value={flha.supervisorId}
                    onValueChange={(v) =>
                      setFlha((prev) => ({ ...prev, supervisorId: v }))
                    }
                    disabled={isClosed}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select supervisor..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {employeeOptions.map((e) => (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                          className="text-sm"
                        >
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SignaturePad
                  label="Supervisor Signature"
                  value={flha.supervisorSignature}
                  onChange={(v) =>
                    setFlha((prev) => ({
                      ...prev,
                      supervisorSignature: v,
                    }))
                  }
                  disabled={isClosed}
                  storagePath={`safety/${form.id}/supervisor-sig.png`}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={formMeta.status}
              onValueChange={(v) =>
                setFormMeta((prev) => ({
                  ...prev,
                  status: v as SafetyForm["status"],
                }))
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="draft" className="text-xs">
                  Draft
                </SelectItem>
                <SelectItem value="submitted" className="text-xs">
                  Submitted
                </SelectItem>
                <SelectItem value="reviewed" className="text-xs">
                  Reviewed
                </SelectItem>
                <SelectItem value="closed" className="text-xs">
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={handleSave}
            >
              Save Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
