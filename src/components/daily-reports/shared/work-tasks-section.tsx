"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkTasksSectionProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
  disabled?: boolean;
}

export function WorkTasksSection({ tasks, onChange, disabled }: WorkTasksSectionProps) {
  return (
    <section>
      <Label className="text-sm font-semibold">Work Tasks</Label>
      <div className="mt-2 space-y-1.5">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-5 text-right shrink-0">
              {idx + 1}.
            </span>
            <Input
              value={task}
              onChange={(e) => {
                const next = [...tasks];
                next[idx] = e.target.value;
                onChange(next);
              }}
              placeholder={`Task ${idx + 1}…`}
              className="h-9 text-sm flex-1"
              disabled={disabled}
            />
            {tasks.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(tasks.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1 cursor-pointer mt-1"
            onClick={() => onChange([...tasks, ""])}
          >
            <Plus className="h-3 w-3" />
            Add Task
          </Button>
        )}
      </div>
    </section>
  );
}
