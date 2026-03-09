"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
  Command,
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
  useDevelopers,
} from "@/hooks/use-firestore";

import { lookupName } from "@/lib/utils/lookup";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop input */}
      <div className="relative hidden md:block">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search... ⌘K"
          aria-label="Search"
          className="w-64 h-9 pl-9 pr-3 rounded-md border border-input bg-white dark:bg-muted/50 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
      </div>

      {/* Mobile button */}
      <button
        type="button"
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </button>

      {/* Dropdown results */}
      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 md:w-96 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
          <Command shouldFilter={true} className="rounded-lg">
            {/* Hidden input synced to the visible one — cmdk needs its own input for filtering */}
            <div className="sr-only">
              <CommandInput value={query} onValueChange={setQuery} />
            </div>
            <CommandList className="max-h-[360px]">
              <CommandEmpty>No results found.</CommandEmpty>

              {/* Pages */}
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

              {query.trim().length > 0 && (
                <SearchResults navigate={navigate} />
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

function SearchResults({ navigate }: { navigate: (path: string) => void }) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: safetyForms } = useSafetyForms();
  const { data: dailyReports } = useDailyReports();
  const { data: developers } = useDevelopers();

  const developerMap = React.useMemo(
    () => Object.fromEntries(developers.map((d) => [d.id, d.name])),
    [developers]
  );

  return (
    <>
      <CommandSeparator />

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

      {projects.length > 0 && (
        <CommandGroup heading="Projects">
          {projects.map((proj) => (
            <CommandItem
              key={proj.id}
              value={`project ${proj.name} ${proj.number} ${developerMap[proj.developerId] || ""} ${proj.address}`}
              onSelect={() => navigate("/projects")}
            >
              <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">{proj.name}</span>
                <span className="text-xs text-muted-foreground">
                  {developerMap[proj.developerId] || "—"} · {proj.status}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      <CommandSeparator />

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
