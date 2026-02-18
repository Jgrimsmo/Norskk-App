"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Database } from "lucide-react";
import { create } from "@/lib/firebase/firestore";
import { Collections } from "@/lib/firebase/collections";
import {
  employees,
  projects,
  costCodes,
  equipment,
  attachments,
  tools,
  sampleTimeEntries,
  safetyForms,
  sampleDispatches,
  sampleDailyReports,
} from "@/lib/data/time-tracking-data";

interface SeedStep {
  label: string;
  collection: string;
  data: { id: string }[];
}

const ENABLE_SEED_PAGE = process.env.NEXT_PUBLIC_ENABLE_SEED_PAGE === "true";

const steps: SeedStep[] = [
  { label: "Employees", collection: Collections.EMPLOYEES, data: employees },
  { label: "Projects", collection: Collections.PROJECTS, data: projects },
  { label: "Cost Codes", collection: Collections.COST_CODES, data: costCodes },
  { label: "Equipment", collection: Collections.EQUIPMENT, data: equipment },
  { label: "Attachments", collection: Collections.ATTACHMENTS, data: attachments },
  { label: "Tools", collection: Collections.TOOLS, data: tools },
  { label: "Time Entries", collection: Collections.TIME_ENTRIES, data: sampleTimeEntries },
  { label: "Safety Forms", collection: Collections.SAFETY_FORMS, data: safetyForms },
  { label: "Dispatches", collection: Collections.DISPATCHES, data: sampleDispatches },
  { label: "Daily Reports", collection: Collections.DAILY_REPORTS, data: sampleDailyReports },
];

export default function SeedPage() {
  const [running, setRunning] = React.useState(false);
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = React.useState<string | null>(null);

  const runSeed = async () => {
    if (!ENABLE_SEED_PAGE) {
      toast.error("Seeding is disabled", {
        description: "Enable NEXT_PUBLIC_ENABLE_SEED_PAGE=true to use this page.",
      });
      return;
    }

    setRunning(true);
    setCompleted(new Set());

    for (const step of steps) {
      setCurrentStep(step.label);
      try {
        for (const item of step.data) {
          await create(step.collection, item);
        }
        setCompleted((prev) => new Set(prev).add(step.label));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed seeding ${step.label}`, { description: msg });
        setRunning(false);
        setCurrentStep(null);
        return;
      }
    }

    setCurrentStep(null);
    setRunning(false);
    toast.success("Database seeded!", {
      description: `${steps.reduce((n, s) => n + s.data.length, 0)} documents written across ${steps.length} collections.`,
    });
  };

  if (!ENABLE_SEED_PAGE) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-6 shadow-sm text-center">
          <h1 className="text-xl font-bold">Seeding Disabled</h1>
          <p className="text-sm text-muted-foreground">
            This environment does not allow database seeding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Database className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Seed Firestore</h1>
          <p className="text-sm text-muted-foreground">
            Load mock data into your Firestore database. This writes{" "}
            <strong>{steps.reduce((n, s) => n + s.data.length, 0)}</strong> documents
            across <strong>{steps.length}</strong> collections.
          </p>
        </div>

        {/* Progress list */}
        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {completed.has(step.label) ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : currentStep === step.label ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border" />
                )}
                {step.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {step.data.length} docs
              </span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={runSeed}
          disabled={running}
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Seeding…
            </>
          ) : completed.size === steps.length ? (
            "Seed again"
          ) : (
            "Seed Database"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Safe to run multiple times — it overwrites by document ID.
        </p>
      </div>
    </div>
  );
}
