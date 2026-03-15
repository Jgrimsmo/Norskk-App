"use client";

import * as React from "react";
import { Wrench, X, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import type { Equipment } from "@/lib/types/time-tracking";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

interface EquipmentPickerSectionProps {
  selected: string[];
  onToggle: (eqId: string) => void;
  equipment: Equipment[];
  disabled?: boolean;
}

export function EquipmentPickerSection({
  selected,
  onToggle,
  equipment,
  disabled,
}: EquipmentPickerSectionProps) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return equipment
      .filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID)
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.number && e.number.toLowerCase().includes(q))
      );
  }, [search, equipment]);

  return (
    <section>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-yellow-500" />
        On-site Equipment ({selected.length})
      </h3>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((eqId) => {
            const eq = equipment.find((e) => e.id === eqId);
            return (
              <span
                key={eqId}
                className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 text-xs font-medium"
              >
                {eq?.name ?? eqId}
                {eq?.number && (
                  <span className="opacity-60">#{eq.number}</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onToggle(eqId)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment…"
              className="h-9 text-sm pl-8 rounded-lg focus-visible:ring-1"
            />
          </div>
          {search.trim().length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md">
              <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5">
                {filtered.map((eq) => {
                  const checked = selected.includes(eq.id);
                  return (
                    <label
                      key={eq.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => { onToggle(eq.id); setSearch(""); }}
                        className="h-3.5 w-3.5"
                      />
                      <span className={checked ? "font-medium" : ""}>
                        {eq.name}
                      </span>
                      {eq.number && (
                        <span className="text-muted-foreground text-xs">#{eq.number}</span>
                      )}
                      {eq.category && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          {eq.category}
                        </span>
                      )}
                    </label>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No equipment found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
