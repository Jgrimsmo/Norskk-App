"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { FormFieldType } from "@/lib/types/forms";
import { FIELD_TYPES } from "./constants";

export function AddFieldPalette({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1 border-dashed cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Plus className="h-3 w-3" /> Add Field
      </Button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 p-2 rounded-lg border bg-muted/30">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              onClick={() => {
                onAdd(ft.type);
                setOpen(false);
              }}
              className="text-left px-2.5 py-2 rounded-md hover:bg-card border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <div className="text-xs font-medium">{ft.label}</div>
              <div className="text-[10px] text-muted-foreground">{ft.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
