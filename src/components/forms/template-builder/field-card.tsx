"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { FormField } from "@/lib/types/forms";
import { FIELD_TYPES } from "./constants";

interface FieldCardProps {
  field: FormField;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function FieldCard({
  field,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
}: FieldCardProps) {
  const typeDef = FIELD_TYPES.find((t) => t.type === field.type);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 group hover:border-primary/30 transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {field.label || <span className="text-muted-foreground italic">No label</span>}
          </span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {typeDef?.label || field.type}
          </Badge>
          {field.required && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              Required
            </Badge>
          )}
          {field.conditional && (
            <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">
              Conditional
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onMoveDown} disabled={isLast}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive cursor-pointer" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
