"use client";

import * as React from "react";
import { Building2, Clock, CheckCircle2, PauseCircle, LayoutGrid } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsTable } from "@/components/projects/projects-table";
import { DevelopersTable } from "@/components/projects/developers-table";
import { type Project, type ProjectStatus } from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { RequirePermission } from "@/components/require-permission";

type StatusTab = ProjectStatus | "all";

const STATUS_TABS: { value: StatusTab; label: string; icon: React.ElementType; color: string }[] = [
  { value: "active",    label: "Active",    icon: Building2,    color: "text-green-600" },
  { value: "bidding",   label: "Bidding",   icon: Clock,        color: "text-purple-600" },
  { value: "on-hold",   label: "On Hold",   icon: PauseCircle,  color: "text-yellow-600" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-blue-600" },
  { value: "all",       label: "All",       icon: LayoutGrid,   color: "text-muted-foreground" },
];

export default function ProjectsPage() {
  const [projects, setProjects, loading, saving] = useFirestoreState<Project>(Collections.PROJECTS);
  const [pageTab, setPageTab] = React.useState("projects");
  const [statusTab, setStatusTab] = React.useState<StatusTab>("active");

  const counts = {
    active:    projects.filter((p) => p.status === "active").length,
    bidding:   projects.filter((p) => p.status === "bidding").length,
    "on-hold": projects.filter((p) => p.status === "on-hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
    all:       projects.length,
  };

  const visibleProjects =
    statusTab === "all" ? projects : projects.filter((p) => p.status === statusTab);

  return (
    <RequirePermission permission="projects.view">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
        <p className="text-muted-foreground">Manage and track all your construction projects.</p>
      </div>

      <Tabs value={pageTab} onValueChange={setPageTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="developers">Developers</TabsTrigger>
        </TabsList>

        {/* ── Projects tab ── */}
        <TabsContent value="projects" className="space-y-4 mt-0">

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(({ value, label, icon: Icon, color }) => {
              const count = counts[value];
              const isActive = statusTab === value;
              return (
                <button
                  key={value}
                  onClick={() => setStatusTab(value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-card border-primary/50 shadow-sm"
                      : "bg-card/60 border-transparent hover:border-muted-foreground/30 hover:bg-card"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                  <span className={`ml-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                    isActive ? `bg-primary/10 ${color}` : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ProjectsTable
              projects={visibleProjects}
              onProjectsChange={setProjects}
              onAddDeveloper={() => setPageTab("developers")}
            />
          )}
        </TabsContent>

        {/* ── Developers tab ── */}
        <TabsContent value="developers" className="mt-0">
          <DevelopersTable />
        </TabsContent>
      </Tabs>

      <SavingIndicator saving={saving} />
    </div>
    </RequirePermission>
  );
}

