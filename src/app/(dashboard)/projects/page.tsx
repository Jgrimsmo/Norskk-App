"use client";

import * as React from "react";
import {
  FolderKanban,
  Download,
  Building2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProjectsTable } from "@/components/projects/projects-table";
import { type Project } from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";

export default function ProjectsPage() {
  const [projects, setProjects, loading, saving] = useFirestoreState<Project>(Collections.PROJECTS);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const biddingCount = projects.filter((p) => p.status === "bidding").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-muted-foreground">
            Manage and track all your construction projects.
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
            <Building2 className="h-4 w-4" />
            Active Projects
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {activeCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Bidding
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-600">
            {biddingCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {completedCount}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ProjectsTable projects={projects} onProjectsChange={setProjects} />
      )}
      <SavingIndicator saving={saving} />
    </div>
  );
}
