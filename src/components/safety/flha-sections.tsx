"use client";

import * as React from "react";
import {
  AlertTriangle,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignaturePad } from "@/components/safety/signature-pad";

import type {
  HazardItem,
  HazardRating,
  PPEItem,
  CheckValue,
  CrewMember,
} from "@/lib/types/time-tracking";

// ── Shared helpers ──

export const ratingColors: Record<HazardRating, string> = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-red-100 text-red-800 border-red-300",
  na: "bg-gray-100 text-gray-500 border-gray-200",
};

export const checkLabels: Record<CheckValue, string> = {
  yes: "Yes",
  no: "No",
  na: "N/A",
};

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function SectionHeader({
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

// ────────────────────────────────────────────────────────
// Hazard Identification Section
// ────────────────────────────────────────────────────────
interface HazardSectionProps {
  hazards: HazardItem[];
  isClosed: boolean;
  onUpdateHazard: (id: string, field: keyof HazardItem, value: unknown) => void;
}

export function HazardIdentificationSection({
  hazards,
  isClosed,
  onUpdateHazard,
}: HazardSectionProps) {
  const hazardsByCategory = groupBy(hazards, (h) => h.category);

  return (
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
        {Object.entries(hazardsByCategory).map(([category, items]) => (
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
                        onUpdateHazard(hazard.id, "identified", Boolean(v))
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
                          onUpdateHazard(hazard.id, "rating", v as HazardRating)
                        }
                        disabled={isClosed}
                      >
                        <SelectTrigger className="h-7 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="low" className="text-xs">
                            <Badge variant="outline" className={`text-[10px] ${ratingColors.low}`}>
                              Low
                            </Badge>
                          </SelectItem>
                          <SelectItem value="medium" className="text-xs">
                            <Badge variant="outline" className={`text-[10px] ${ratingColors.medium}`}>
                              Medium
                            </Badge>
                          </SelectItem>
                          <SelectItem value="high" className="text-xs">
                            <Badge variant="outline" className={`text-[10px] ${ratingColors.high}`}>
                              High
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    {hazard.identified ? (
                      <Input
                        value={hazard.controls}
                        onChange={(e) =>
                          onUpdateHazard(hazard.id, "controls", e.target.value)
                        }
                        disabled={isClosed}
                        placeholder="Control measures..."
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Crew Acknowledgment Section
// ────────────────────────────────────────────────────────
interface CrewAcknowledgmentSectionProps {
  crewMembers: CrewMember[];
  isClosed: boolean;
  formId: string;
  employeeOptions: { id: string; label: string }[];
  onAdd: () => void;
  onUpdate: (idx: number, field: keyof CrewMember, value: string) => void;
  onRemove: (idx: number) => void;
}

export function CrewAcknowledgmentSection({
  crewMembers,
  isClosed,
  formId,
  employeeOptions,
  onAdd,
  onUpdate,
  onRemove,
}: CrewAcknowledgmentSectionProps) {
  return (
    <div>
      <SectionHeader icon={Users} number={5} title="Crew Acknowledgment" />
      <p className="text-xs text-muted-foreground mb-4">
        Each crew member must be listed and sign to acknowledge they have
        reviewed this FLHA and understand the hazards and controls.
      </p>

      <div className="space-y-4">
        {crewMembers.map((cm, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
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
                  onClick={() => onRemove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Select
              value={cm.employeeId}
              onValueChange={(v) => onUpdate(idx, "employeeId", v)}
              disabled={isClosed}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select crew member..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {employeeOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id} className="text-sm">
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SignaturePad
              label="Signature"
              value={cm.signatureDataUrl}
              onChange={(v) => onUpdate(idx, "signatureDataUrl", v)}
              disabled={isClosed}
              storagePath={`safety/${formId}/crew-${idx}-sig.png`}
            />
          </div>
        ))}

        {!isClosed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs cursor-pointer"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Crew Member
          </Button>
        )}
      </div>
    </div>
  );
}
