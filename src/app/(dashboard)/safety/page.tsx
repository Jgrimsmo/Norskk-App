"use client";

import * as React from "react";
import {
  Download,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SafetyFormsTable } from "@/components/safety/safety-forms-table";
import { type SafetyForm } from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { RequirePermission } from "@/components/require-permission";

export default function SafetyPage() {
  const [forms, setForms, loading, saving] = useFirestoreState<SafetyForm>(Collections.SAFETY_FORMS);

  const totalCount = forms.length;
  const draftCount = forms.filter((f) => f.status === "draft").length;
  const submittedCount = forms.filter((f) => f.status === "submitted").length;
  const incidentCount = forms.filter(
    (f) => f.formType === "incident-report" || f.formType === "near-miss"
  ).length;

  return (
    <RequirePermission permission="safety.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Safety
          </h1>
          <p className="text-muted-foreground">
            FLHA, toolbox talks, near misses, incident reports, and inspections.
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
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Total Forms
          </div>
          <div className="mt-1 text-2xl font-bold">{totalCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardCheck className="h-4 w-4" />
            Drafts
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-600">
            {draftCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Awaiting Review
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">
            {submittedCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Incidents / Near Misses
          </div>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {incidentCount}
          </div>
        </div>
      </div>

      {/* Safety Forms Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <SafetyFormsTable forms={forms} onFormsChange={setForms} />
      )}
      <SavingIndicator saving={saving} />
    </div>
    </RequirePermission>
  );
}
