"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  Wrench,
  Clock,
  ShieldCheck,
  FileText,
  Settings,
  LayoutDashboard,
  Truck,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import {
  useEmployees,
  useProjects,
  useEquipment,
  useSafetyForms,
  useDailyReports,
} from "@/hooks/use-firestore";

import { lookupName } from "@/lib/utils/lookup";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across your entire workspace"
    >
      <CommandInput placeholder="Search employees, projects, equipment..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick navigation — always available, no subscriptions needed */}
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate("/")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem onSelect={() => navigate("/employees")}>
            <Users className="mr-2 h-4 w-4" />
            Employees
          </CommandItem>
          <CommandItem onSelect={() => navigate("/equipment")}>
            <Wrench className="mr-2 h-4 w-4" />
            Equipment
          </CommandItem>
          <CommandItem onSelect={() => navigate("/time-tracking")}>
            <Clock className="mr-2 h-4 w-4" />
            Time Tracking
          </CommandItem>
          <CommandItem onSelect={() => navigate("/daily-reports")}>
            <FileText className="mr-2 h-4 w-4" />
            Daily Reports
          </CommandItem>
          <CommandItem onSelect={() => navigate("/safety")}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Safety
          </CommandItem>
          <CommandItem onSelect={() => navigate("/dispatch")}>
            <Truck className="mr-2 h-4 w-4" />
            Dispatch
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        {/* Data-driven search results — only subscribes when dialog is open */}
        {open && <SearchResults navigate={navigate} />}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Data-driven search results that subscribe to Firestore collections.
 * Only mounts when the command dialog is open, so subscriptions
 * are created on-demand and cleaned up when the dialog closes.
 */
function SearchResults({ navigate }: { navigate: (path: string) => void }) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: safetyForms } = useSafetyForms();
  const { data: dailyReports } = useDailyReports();

  return (
    <>
      <CommandSeparator />

        {/* Employees */}
        {employees.length > 0 && (
          <CommandGroup heading="Employees">
            {employees.map((emp) => (
              <CommandItem
                key={emp.id}
                value={`employee ${emp.name} ${emp.role} ${emp.email}`}
                onSelect={() => navigate("/employees")}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{emp.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {emp.role} · {emp.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Projects */}
        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((proj) => (
              <CommandItem
                key={proj.id}
                value={`project ${proj.name} ${proj.number} ${proj.developer} ${proj.address}`}
                onSelect={() => navigate("/projects")}
              >
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{proj.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {proj.developer} · {proj.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Equipment */}
        {equipment.filter((e) => e.id !== EQUIPMENT_NONE_ID).length > 0 && (
          <CommandGroup heading="Equipment">
            {equipment
              .filter((e) => e.id !== EQUIPMENT_NONE_ID)
              .map((eq) => (
                <CommandItem
                  key={eq.id}
                  value={`equipment ${eq.name} ${eq.number} ${eq.category}`}
                  onSelect={() => navigate("/equipment")}
                >
                  <Wrench className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{eq.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {eq.category} · {eq.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Safety Forms */}
        {safetyForms.length > 0 && (
          <CommandGroup heading="Safety Forms">
            {safetyForms.slice(0, 10).map((form) => (
              <CommandItem
                key={form.id}
                value={`safety ${form.title} ${form.formType} ${form.date}`}
                onSelect={() => navigate("/safety")}
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{form.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {form.formType} · {form.date} · {form.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Daily Reports */}
        {dailyReports.length > 0 && (
          <CommandGroup heading="Daily Reports">
            {dailyReports.slice(0, 10).map((report) => {
              const projName = lookupName(report.projectId, projects);
              return (
                <CommandItem
                  key={report.id}
                  value={`report ${projName} ${report.date} #${report.reportNumber}`}
                  onSelect={() => navigate("/daily-reports")}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">
                      #{report.reportNumber} — {projName} — {report.date}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {report.status}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </>
    );
}
