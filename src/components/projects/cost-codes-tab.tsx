"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useCostCodes } from "@/hooks/use-firestore";

// ── Cost Code Checklist ──

function CostCodeChecklist({
  label,
  description,
  assignedIds,
  allCodes,
  onToggle,
}: {
  label: string;
  description: string;
  assignedIds: string[];
  allCodes: import("@/lib/types/time-tracking").CostCode[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const [search, setSearch] = React.useState("");
  const assigned = new Set(assignedIds);

  const filtered = allCodes
    .filter((cc) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return cc.code.toLowerCase().includes(q) || cc.description.toLowerCase().includes(q);
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {assignedIds.length} of {allCodes.length} selected
        </span>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cost codes…"
          className="h-8 text-xs pl-8"
        />
      </div>
      {allCodes.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          No cost codes found. Add them in Settings → Cost Codes.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map((cc) => (
            <label
              key={cc.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <Checkbox
                checked={assigned.has(cc.id)}
                onCheckedChange={(v) => onToggle(cc.id, !!v)}
              />
              <span className="text-xs font-mono font-semibold text-primary w-[90px] shrink-0">
                {cc.code}
              </span>
              <span className="text-xs text-muted-foreground">{cc.description}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No cost codes match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cost Codes Tab ──

export function CostCodesTab({
  assignedIds,
  payablesIds,
  onToggle,
  onTogglePayables,
}: {
  assignedIds: string[];
  payablesIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  onTogglePayables: (id: string, checked: boolean) => void;
}) {
  const { data: allCodes } = useCostCodes();

  return (
    <div className="space-y-8">
      <CostCodeChecklist
        label="Time Tracking"
        description="Cost codes available when logging time entries on this project."
        assignedIds={assignedIds}
        allCodes={allCodes}
        onToggle={onToggle}
      />
      <div className="border-t" />
      <CostCodeChecklist
        label="Payables"
        description="Cost codes available when uploading invoices for this project."
        assignedIds={payablesIds}
        allCodes={allCodes}
        onToggle={onTogglePayables}
      />
    </div>
  );
}
