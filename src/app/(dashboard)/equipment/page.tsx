"use client";

import * as React from "react";
import { Wrench, Download, CheckCircle2, AlertTriangle, Plus, X, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentTable } from "@/components/equipment/equipment-table";
import { AttachmentsTable } from "@/components/equipment/attachments-table";
import { ToolsTable } from "@/components/equipment/tools-table";
import {
  type Equipment,
  type Attachment,
  type Tool,
  type EquipmentCategory,
} from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections, EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { RequirePermission } from "@/components/require-permission";

// ── Category manager card ──
function CategoryManager({
  title,
  items,
  onChange,
  idPrefix,
}: {
  title: string;
  items: EquipmentCategory[];
  onChange: (items: EquipmentCategory[] | ((prev: EquipmentCategory[]) => EquipmentCategory[])) => void;
  idPrefix: string;
}) {
  const [newName, setNewName] = React.useState("");

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      toast.warning("Category already exists");
      return;
    }
    onChange((prev) => [...prev, { id: `${idPrefix}-${crypto.randomUUID().slice(0, 8)}`, name }]);
    setNewName("");
  };

  const remove = (id: string) => {
    onChange((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/40">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="New category…"
            className="h-8 text-xs flex-1"
          />
          <Button size="sm" className="h-8 text-xs cursor-pointer px-3" onClick={add} disabled={!newName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No categories yet</p>
        ) : (
          <ul className="space-y-1">
            {items
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((cat) => (
                <li key={cat.id} className="flex items-center justify-between rounded-md px-3 py-1.5 text-xs hover:bg-muted/50 group">
                  <span>{cat.name}</span>
                  <button
                    onClick={() => remove(cat.id)}
                    className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const [allEquipment, setEquipment, loadingEq, savingEq] = useFirestoreState<Equipment>(Collections.EQUIPMENT);
  const [attachments, setAttachments, loadingAtt, savingAtt] = useFirestoreState<Attachment>(Collections.ATTACHMENTS);
  const [tools, setTools, loadingTl, savingTl] = useFirestoreState<Tool>(Collections.TOOLS);
  const [eqCategories, setEqCategories, loadingEqCat, savingEqCat] = useFirestoreState<EquipmentCategory>(Collections.EQUIPMENT_CATEGORIES);
  const [attCategories, setAttCategories, loadingAttCat, savingAttCat] = useFirestoreState<EquipmentCategory>(Collections.ATTACHMENT_CATEGORIES);
  const [toolCategories, setToolCategories, loadingTlCat, savingTlCat] = useFirestoreState<EquipmentCategory>(Collections.TOOL_CATEGORIES);

  const equipment = allEquipment.filter((e) => e.id !== EQUIPMENT_NONE_ID);
  const loading = loadingEq || loadingAtt || loadingTl || loadingEqCat || loadingAttCat || loadingTlCat;
  const saving = savingEq || savingAtt || savingTl || savingEqCat || savingAttCat || savingTlCat;

  const eqCategoryOptions = React.useMemo(() => eqCategories.map((c) => ({ id: c.name, label: c.name })), [eqCategories]);
  const attCategoryOptions = React.useMemo(() => attCategories.map((c) => ({ id: c.name, label: c.name })), [attCategories]);
  const toolCategoryOptions = React.useMemo(() => toolCategories.map((c) => ({ id: c.name, label: c.name })), [toolCategories]);

  const totalCount = equipment.length;
  const availableCount = equipment.filter(
    (e) => e.status === "available"
  ).length;
  const maintenanceCount = equipment.filter(
    (e) => e.status === "maintenance"
  ).length;

  return (
    <RequirePermission permission="equipment.view">
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

      {/* Equipment / Attachments / Tools */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="equipment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="equipment" className="cursor-pointer">Equipment</TabsTrigger>
            <TabsTrigger value="attachments" className="cursor-pointer">Attachments</TabsTrigger>
            <TabsTrigger value="tools" className="cursor-pointer">Tools</TabsTrigger>
            <TabsTrigger value="settings" className="cursor-pointer gap-1">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment">
            <EquipmentTable
              equipment={equipment}
              onEquipmentChange={setEquipment}
              categoryOptions={eqCategoryOptions}
            />
          </TabsContent>

          <TabsContent value="attachments">
            <AttachmentsTable
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              categoryOptions={attCategoryOptions}
            />
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTable tools={tools} onToolsChange={setTools} categoryOptions={toolCategoryOptions} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6 md:grid-cols-3">
              <CategoryManager title="Equipment Categories" items={eqCategories} onChange={setEqCategories} idPrefix="eqcat" />
              <CategoryManager title="Attachment Categories" items={attCategories} onChange={setAttCategories} idPrefix="attcat" />
              <CategoryManager title="Tool Categories" items={toolCategories} onChange={setToolCategories} idPrefix="tlcat" />
            </div>
          </TabsContent>
        </Tabs>
      )}
      <SavingIndicator saving={saving} />
    </div>
    </RequirePermission>
  );
}
