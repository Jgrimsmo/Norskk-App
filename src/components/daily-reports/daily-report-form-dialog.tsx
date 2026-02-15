"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  ShieldCheck,
  StickyNote,
  CalendarPlus,
  Camera,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { SignaturePad } from "@/components/safety/signature-pad";
import { PhotoUpload } from "@/components/shared/photo-upload";

import type {
  DailyReport,
  DailyReportStatus,
  WeatherCondition,
  ManpowerEntry,
  EquipmentLogEntry,
  WorkPerformedEntry,
  DelayEntry,
  MaterialDelivery,
  VisitorEntry,
} from "@/lib/types/time-tracking";

import {
  useEmployees,
  useProjects,
  useEquipment,
} from "@/hooks/use-firestore";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";
import { dailyReportStatusColors as statusColors } from "@/lib/constants/status-colors";
import {
  nextEntryId,
  WeatherSection,
  ManpowerSection,
  EquipmentLogSection,
  WorkPerformedSection,
  DelaysSection,
  MaterialDeliveriesSection,
  VisitorsSection,
} from "./daily-report-sections";

// ── Props ──
interface DailyReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DailyReport;
  onSave: (report: DailyReport) => void;
}

export default function DailyReportFormDialog({
  open,
  onOpenChange,
  report,
  onSave,
}: DailyReportFormDialogProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();

  const [form, setForm] = React.useState<DailyReport>({ ...report });
  const isLocked = form.status === "approved";
  const isDirty = JSON.stringify(form) !== JSON.stringify(report);
  const { confirmClose } = useUnsavedWarning(isDirty && open);

  React.useEffect(() => {
    setForm({ ...report });
  }, [report]);

  // ── Field updaters ──
  const update = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) => {
    if (isLocked) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateWeather = <K extends keyof DailyReport["weather"]>(
    key: K,
    value: DailyReport["weather"][K]
  ) => {
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      weather: { ...prev.weather, [key]: value },
    }));
  };

  const toggleWeatherCondition = (cond: WeatherCondition) => {
    if (isLocked) return;
    setForm((prev) => {
      const conditions = prev.weather.conditions.includes(cond)
        ? prev.weather.conditions.filter((c) => c !== cond)
        : [...prev.weather.conditions, cond];
      return { ...prev, weather: { ...prev.weather, conditions } };
    });
  };

  // ── Array helpers ──
  function addEntry<T>(key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors", entry: T) {
    if (isLocked) return;
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] as T[]), entry] }));
  }

  function removeEntry(key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors", id: string) {
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as { id: string }[]).filter((e) => e.id !== id),
    }));
  }

  function updateEntry(
    key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors",
    id: string,
    updates: Record<string, unknown>
  ) {
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as { id: string }[]).map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }));
  }

  const project = projects.find((p) => p.id === form.projectId);
  const author = employees.find((e) => e.id === form.authorId);

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next && !confirmClose()) return;
      onOpenChange(next);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                Daily Report #{form.reportNumber}
                <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[form.status]}`}>
                  {form.status}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project?.number} — {project?.name} · {format(parseISO(form.date), "EEEE, MMMM d, yyyy")}
                {author && ` · By ${author.name}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* ─── Section 1: Weather ─── */}
            <WeatherSection
              weather={form.weather}
              isLocked={isLocked}
              onUpdateWeather={updateWeather}
              onToggleCondition={toggleWeatherCondition}
            />

            <Separator />

            {/* ─── Section 2: Manpower ─── */}
            <ManpowerSection
              entries={form.manpower}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<ManpowerEntry>("manpower", {
                  id: nextEntryId("mp"),
                  company: "Norskk",
                  trade: "",
                  headcount: 1,
                  hoursWorked: 8,
                  overtimeHours: 0,
                  foremanName: "",
                  workDescription: "",
                })
              }
              onRemove={(id) => removeEntry("manpower", id)}
              onUpdate={(id, updates) => updateEntry("manpower", id, updates)}
            />

            <Separator />

            {/* ─── Section 3: Equipment Log ─── */}
            <EquipmentLogSection
              entries={form.equipmentLog}
              equipment={equipment}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<EquipmentLogEntry>("equipmentLog", {
                  id: nextEntryId("el"),
                  equipmentId: "",
                  hoursUsed: 0,
                  idleHours: 0,
                  operatorName: "",
                  notes: "",
                })
              }
              onRemove={(id) => removeEntry("equipmentLog", id)}
              onUpdate={(id, updates) => updateEntry("equipmentLog", id, updates)}
            />

            <Separator />

            {/* ─── Section 4: Work Performed ─── */}
            <WorkPerformedSection
              entries={form.workPerformed}
              reportId={form.id}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<WorkPerformedEntry>("workPerformed", {
                  id: nextEntryId("wp"),
                  description: "",
                  location: "",
                  trade: "",
                  status: "in-progress",
                  percentComplete: 0,
                  photoUrls: [],
                  notes: "",
                })
              }
              onRemove={(id) => removeEntry("workPerformed", id)}
              onUpdate={(id, updates) => updateEntry("workPerformed", id, updates)}
            />

            <Separator />

            {/* ─── Section 5: Delays ─── */}
            <DelaysSection
              entries={form.delays}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<DelayEntry>("delays", {
                  id: nextEntryId("d"),
                  delayType: "other",
                  description: "",
                  durationHours: 0,
                  responsibleParty: "",
                  scheduleImpact: false,
                })
              }
              onRemove={(id) => removeEntry("delays", id)}
              onUpdate={(id, updates) => updateEntry("delays", id, updates)}
            />

            <Separator />

            {/* ─── Section 6: Material Deliveries ─── */}
            <MaterialDeliveriesSection
              entries={form.materialDeliveries}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<MaterialDelivery>("materialDeliveries", {
                  id: nextEntryId("md"),
                  description: "",
                  supplier: "",
                  quantity: "",
                  poNumber: "",
                  deliveryTicket: "",
                  receivedBy: "",
                  condition: "good",
                  notes: "",
                })
              }
              onRemove={(id) => removeEntry("materialDeliveries", id)}
              onUpdate={(id, updates) => updateEntry("materialDeliveries", id, updates)}
            />

            <Separator />

            {/* ─── Section 7: Visitors ─── */}
            <VisitorsSection
              entries={form.visitors}
              isLocked={isLocked}
              onAdd={() =>
                addEntry<VisitorEntry>("visitors", {
                  id: nextEntryId("v"),
                  name: "",
                  company: "",
                  purpose: "",
                  timeIn: "",
                  timeOut: "",
                })
              }
              onRemove={(id) => removeEntry("visitors", id)}
              onUpdate={(id, updates) => updateEntry("visitors", id, updates)}
            />

            <Separator />

            {/* ─── Section 8: Safety, Notes & Next Day ─── */}

            {/* ─── Section 8: Safety, Notes & Next Day ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Safety Notes
              </h3>
              <Textarea
                value={form.safetyNotes}
                onChange={(e) => update("safetyNotes", e.target.value)}
                placeholder="Toolbox talks, incidents, PPE compliance, hazards observed…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <StickyNote className="h-4 w-4 text-gray-500" />
                General Notes
              </h3>
              <Textarea
                value={form.generalNotes}
                onChange={(e) => update("generalNotes", e.target.value)}
                placeholder="General observations, progress summary, correspondence…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <CalendarPlus className="h-4 w-4 text-indigo-500" />
                Next Day Plan
              </h3>
              <Textarea
                value={form.nextDayPlan}
                onChange={(e) => update("nextDayPlan", e.target.value)}
                placeholder="Planned activities for tomorrow…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            {/* ─── Section 9: Photos ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 text-sky-500" />
                Report Photos ({form.photoUrls.length})
              </h3>
              <PhotoUpload
                photos={form.photoUrls}
                onChange={(urls) => update("photoUrls", urls)}
                storagePath={`daily-reports/${form.id}/photos`}
                disabled={isLocked}
              />
            </section>

            <Separator />

            {/* ─── Section 10: Signatures ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Signatures</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SignaturePad
                  label={`Author — ${author?.name ?? "Unknown"}`}
                  value={form.authorSignature}
                  onChange={(sig) => update("authorSignature", sig)}
                  disabled={isLocked}
                  storagePath={`daily-reports/${form.id}/author-sig.png`}
                />
                <SignaturePad
                  label="Approver"
                  value={form.approverSignature}
                  onChange={(sig) => update("approverSignature", sig)}
                  disabled={isLocked}
                  storagePath={`daily-reports/${form.id}/approver-sig.png`}
                />
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            {!isLocked && (
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as DailyReportStatus)}
              >
                <SelectTrigger className="h-8 w-36 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                  <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                  <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {!isLocked && (
              <Button
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => {
                  onSave(form);
                  onOpenChange(false);
                }}
              >
                Save Report
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
