"use client";

import * as React from "react";
import { Wrench, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EquipmentTable } from "@/components/equipment/equipment-table";
import { AttachmentsTable } from "@/components/equipment/attachments-table";
import { ToolsTable } from "@/components/equipment/tools-table";
import {
  type Equipment,
  type Attachment,
  type Tool,
} from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections, EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";

export default function EquipmentPage() {
  const [allEquipment, setEquipment, loadingEq, savingEq] = useFirestoreState<Equipment>(Collections.EQUIPMENT);
  const [attachments, setAttachments, loadingAtt, savingAtt] = useFirestoreState<Attachment>(Collections.ATTACHMENTS);
  const [tools, setTools, loadingTl, savingTl] = useFirestoreState<Tool>(Collections.TOOLS);

  const equipment = allEquipment.filter((e) => e.id !== EQUIPMENT_NONE_ID);
  const loading = loadingEq || loadingAtt || loadingTl;
  const saving = savingEq || savingAtt || savingTl;

  const totalCount = equipment.length;
  const availableCount = equipment.filter(
    (e) => e.status === "available"
  ).length;
  const maintenanceCount = equipment.filter(
    (e) => e.status === "maintenance"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Equipment
          </h1>
          <p className="text-muted-foreground">
            Track equipment, attachments, and tools.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Export coming soon", { description: "CSV and PDF export will be available once the backend is connected." })}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Total Equipment
          </div>
          <div className="mt-1 text-2xl font-bold">{totalCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Available
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {availableCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            In Maintenance
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">
            {maintenanceCount}
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Equipment
            </h2>
            <EquipmentTable
              equipment={equipment}
              onEquipmentChange={setEquipment}
            />
          </div>

          {/* Attachments Table */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Attachments
            </h2>
            <AttachmentsTable
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>

          {/* Tools Table */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Tools
            </h2>
            <ToolsTable tools={tools} onToolsChange={setTools} />
          </div>
        </>
      )}
      <SavingIndicator saving={saving} />
    </div>
  );
}
