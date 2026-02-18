"use client";

import * as React from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  Clock,
  Plus,
  ArrowLeft,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useEmployees,
  useProjects,
  useCostCodes,
  useEquipment,
  useAttachments,
  useTools,
  useTimeEntries,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import type { TimeEntry, WorkType } from "@/lib/types/time-tracking";

// ────────────────────────────────────────────────────────
// Field Time Entry — Mobile-first time tracking
// ────────────────────────────────────────────────────────

export function FieldTimeEntry() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);
  const dateFromParam = searchParams.get("date");
  const hasFixedDate = Boolean(dateFromParam) && !isEditing;

  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: costCodes } = useCostCodes();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const { data: allEntries, add, update } = useTimeEntries();

  // ── Find existing entry when editing ──
  const existingEntry = React.useMemo(
    () => (editId ? allEntries.find((e) => e.id === editId) : undefined),
    [editId, allEntries]
  );

  // ── Form state (pre-fill from query params or existing entry) ──
  const [employeeId, setEmployeeId] = React.useState(
    searchParams.get("employee") || ""
  );
  const [date, setDate] = React.useState(
    searchParams.get("date") || format(new Date(), "yyyy-MM-dd")
  );
  const [projectId, setProjectId] = React.useState("");
  const [costCodeId, setCostCodeId] = React.useState("");
  const [equipmentId, setEquipmentId] = React.useState("");
  const [attachmentId, setAttachmentId] = React.useState("");
  const [toolId, setToolId] = React.useState("");
  const [workType, setWorkType] = React.useState<WorkType>("tm");
  const [hours, setHours] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [initialized, setInitialized] = React.useState(!isEditing);

  // ── Populate form when editing an existing entry ──
  React.useEffect(() => {
    if (isEditing && existingEntry && !initialized) {
      setEmployeeId(existingEntry.employeeId);
      setDate(existingEntry.date);
      setProjectId(existingEntry.projectId);
      setCostCodeId(existingEntry.costCodeId);
      setEquipmentId(existingEntry.equipmentId || "");
      setAttachmentId(existingEntry.attachmentId || "");
      setToolId(existingEntry.toolId || "");
      setWorkType(existingEntry.workType);
      setHours(String(existingEntry.hours));
      setNotes(existingEntry.notes || "");
      setInitialized(true);
    }
  }, [isEditing, existingEntry, initialized]);

  // ── Derived data ──
  const currentEmployee = React.useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId]
  );
  const activeProjects = React.useMemo(
    () => projects.filter((p) => p.status === "active" || p.status === "bidding"),
    [projects]
  );
  const selectedProject = activeProjects.find((p) => p.id === projectId);
  const projectCostCodes = React.useMemo(
    () =>
      selectedProject
        ? costCodes.filter((cc) => selectedProject.costCodeIds.includes(cc.id))
        : [],
    [selectedProject, costCodes]
  );
  const availableEquipment = React.useMemo(
    () => equipment.filter((e) => e.id !== EQUIPMENT_NONE_ID && e.status !== "retired"),
    [equipment]
  );
  const availableAttachments = React.useMemo(
    () => attachments.filter((a) => a.status !== "retired"),
    [attachments]
  );
  const availableTools = React.useMemo(
    () => tools.filter((t) => t.status !== "retired" && t.status !== "lost"),
    [tools]
  );

  // Reset cost code when project changes
  React.useEffect(() => {
    setCostCodeId("");
  }, [projectId]);

  // ── Submit handler ──
  const canSubmit =
    employeeId && date && projectId && costCodeId && hours && Number(hours) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isEditing && editId) {
        // Update existing entry
        await update(editId, {
          date,
          employeeId,
          projectId,
          costCodeId,
          equipmentId: equipmentId || "",
          attachmentId: attachmentId || "",
          toolId: toolId || "",
          workType,
          hours: Number(hours),
          notes,
        });
        toast.success("Entry updated!");
        router.push("/field");
      } else {
        // Create new entry
        const entry: TimeEntry = {
          id: `te-${crypto.randomUUID().slice(0, 8)}`,
          date,
          employeeId,
          projectId,
          costCodeId,
          equipmentId: equipmentId || "",
          attachmentId: attachmentId || "",
          toolId: toolId || "",
          workType,
          hours: Number(hours),
          notes,
          approval: "pending",
        };
        await add(entry);
        toast.success("Time entry submitted!");

        // Reset form but keep employee & date
        setProjectId("");
        setCostCodeId("");
        setEquipmentId("");
        setAttachmentId("");
        setToolId("");
        setHours("");
        setNotes("");
      }
    } catch {
      toast.error(isEditing ? "Failed to update entry" : "Failed to submit entry");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick date buttons (only used when no fixed date) ──
  const quickDates = [
    { label: "Today", value: format(new Date(), "yyyy-MM-dd") },
    { label: "Yesterday", value: format(subDays(new Date(), 1), "yyyy-MM-dd") },
  ];

  // Formatted display date for header
  const displayDate = React.useMemo(() => {
    try {
      return format(parseISO(date), "EEEE, MMMM d, yyyy");
    } catch {
      return date;
    }
  }, [date]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/field">
          <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isEditing ? "Edit Entry" : "Add Entry"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFixedDate ? displayDate : isEditing ? "Update your time entry" : "Submit your hours for the day"}
          </p>
        </div>
      </div>

      {/* ── Entry Form ── */}
      <div className="rounded-xl border bg-card shadow-sm p-4 space-y-4">
        {/* Employee — read-only display */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Submitting as</span>
          <span className="font-semibold">
            {currentEmployee?.name ?? "Unknown"}
          </span>
        </div>

        <Separator />

        {/* Date — only show picker if no fixed date from dashboard */}
        {!hasFixedDate && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <div className="flex gap-2">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.value}
                    variant={date === qd.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-sm cursor-pointer"
                    onClick={() => setDate(qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
              </div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 text-sm cursor-pointer"
              />
            </div>
            <Separator />
          </>
        )}

        {/* Project */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-11 text-sm cursor-pointer">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {activeProjects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-sm">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cost Code */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Cost Code</Label>
          <Select
            value={costCodeId}
            onValueChange={setCostCodeId}
            disabled={!projectId}
          >
            <SelectTrigger className="h-11 text-sm cursor-pointer">
              <SelectValue placeholder={projectId ? "Select code…" : "Pick project first"} />
            </SelectTrigger>
            <SelectContent>
              {projectCostCodes.map((cc) => (
                <SelectItem key={cc.id} value={cc.id} className="text-sm">
                  {cc.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Equipment (optional) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Equipment <span className="text-xs">(optional)</span>
          </Label>
          <Select value={equipmentId || "__none"} onValueChange={(v) => setEquipmentId(v === "__none" ? "" : v)}>
            <SelectTrigger className="h-11 text-sm cursor-pointer">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {availableEquipment.map((eq) => (
                <SelectItem key={eq.id} value={eq.id} className="text-sm">
                  {eq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attachment (optional) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Attachment <span className="text-xs">(optional)</span>
          </Label>
          <Select value={attachmentId || "__none"} onValueChange={(v) => setAttachmentId(v === "__none" ? "" : v)}>
            <SelectTrigger className="h-11 text-sm cursor-pointer">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {availableAttachments.map((att) => (
                <SelectItem key={att.id} value={att.id} className="text-sm">
                  {att.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tool (optional) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Tool <span className="text-xs">(optional)</span>
          </Label>
          <Select value={toolId || "__none"} onValueChange={(v) => setToolId(v === "__none" ? "" : v)}>
            <SelectTrigger className="h-11 text-sm cursor-pointer">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {availableTools.map((tl) => (
                <SelectItem key={tl.id} value={tl.id} className="text-sm">
                  {tl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Hours & Work Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Hours</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0.0"
              className="h-11 text-sm text-center text-lg font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Work Type</Label>
            <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
              <SelectTrigger className="h-11 text-sm cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tm">T&M</SelectItem>
                <SelectItem value="lump-sum">Lump Sum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Notes <span className="text-xs">(optional)</span>
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for this entry…"
            className="h-11 text-sm"
          />
        </div>

        {/* Submit / Save */}
        <Button
          className="w-full h-12 text-base font-semibold gap-2 cursor-pointer"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            "Saving…"
          ) : isEditing ? (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Submit Entry
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
