"use client";

import * as React from "react";
import {
  ChevronDown,
  FolderKanban,
  GripVertical,
  Hammer,
  Paperclip,
  Plus,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

// ── Reusable collapsible section ──────────────────────
function SidebarSection({
  label,
  icon,
  search,
  onSearch,
  searchPlaceholder,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <button
        onClick={onToggle}
        className="w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1 hover:text-foreground transition-colors"
      >
        {icon} {label}
        <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <>
          <div className="relative mb-1.5">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-7 text-xs pl-7 pr-2"
            />
          </div>
          <div className="space-y-0.5">{children}</div>
        </>
      )}
    </div>
  );
}

// ── Simple draggable row (equipment / attachment / tool) ──
function DraggableRow({ id, type, label }: { id: string; type: string; label: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type, id }))}
      className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/60 cursor-grab active:cursor-grabbing text-xs select-none"
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function NoMatches() {
  return <p className="text-[10px] text-muted-foreground/60 text-center py-1">No matches</p>;
}

// ── Main sidebar ──────────────────────────────────────
interface DispatchSidebarProps {
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  hasSelection: boolean;
  clearSelection: () => void;
}

export function DispatchSidebar({
  selectedProjectId,
  setSelectedProjectId,
  hasSelection,
  clearSelection,
}: DispatchSidebarProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  // Filtered base lists
  const activeEmployees = React.useMemo(() => employees.filter((e) => e.status === "active"), [employees]);
  const activeProjects = React.useMemo(() => projects.filter((p) => p.status === "active" || p.status === "bidding"), [projects]);
  const availableEquipment = React.useMemo(() => equipment.filter((e) => e.id !== EQUIPMENT_NONE_ID && e.status !== "retired"), [equipment]);
  const availableAttachments = React.useMemo(() => attachments.filter((a) => a.status !== "retired"), [attachments]);
  const availableTools = React.useMemo(() => tools.filter((t) => t.status !== "retired" && t.status !== "lost"), [tools]);

  // Search state
  const [projSearch, setProjSearch] = React.useState("");
  const [empSearch, setEmpSearch] = React.useState("");
  const [eqSearch, setEqSearch] = React.useState("");
  const [attSearch, setAttSearch] = React.useState("");
  const [tlSearch, setTlSearch] = React.useState("");

  // Accordion open state
  const [projOpen, setProjOpen] = React.useState(true);
  const [empOpen, setEmpOpen] = React.useState(true);
  const [eqOpen, setEqOpen] = React.useState(true);
  const [attOpen, setAttOpen] = React.useState(true);
  const [tlOpen, setTlOpen] = React.useState(true);

  // Filtered lists
  const filteredProjects = React.useMemo(
    () => projSearch ? activeProjects.filter((p) => p.name.toLowerCase().includes(projSearch.toLowerCase())) : activeProjects,
    [projSearch, activeProjects]
  );
  const filteredEmployees = React.useMemo(
    () => empSearch ? activeEmployees.filter((e) => e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.role.toLowerCase().includes(empSearch.toLowerCase())) : activeEmployees,
    [empSearch, activeEmployees]
  );
  const filteredEquipment = React.useMemo(
    () => eqSearch ? availableEquipment.filter((e) => e.name.toLowerCase().includes(eqSearch.toLowerCase()) || e.number.toLowerCase().includes(eqSearch.toLowerCase()) || e.category.toLowerCase().includes(eqSearch.toLowerCase())) : availableEquipment,
    [eqSearch, availableEquipment]
  );
  const filteredAttachments = React.useMemo(
    () => attSearch ? availableAttachments.filter((a) => a.name.toLowerCase().includes(attSearch.toLowerCase()) || a.number.toLowerCase().includes(attSearch.toLowerCase())) : availableAttachments,
    [attSearch, availableAttachments]
  );
  const filteredTools = React.useMemo(
    () => tlSearch ? availableTools.filter((t) => t.name.toLowerCase().includes(tlSearch.toLowerCase()) || t.number.toLowerCase().includes(tlSearch.toLowerCase()) || t.category.toLowerCase().includes(tlSearch.toLowerCase())) : availableTools,
    [tlSearch, availableTools]
  );

  return (
    <div className="w-full md:w-72 shrink-0 rounded-xl md:border bg-card md:shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Dispatch Resources
          </h3>
          {hasSelection && (
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground cursor-pointer" onClick={clearSelection}>
              Clear all
            </Button>
          )}
        </div>
        {hasSelection ? (
          <p className="text-[10px] text-primary font-medium mt-1">
            Click a day or drag across days to place project →
          </p>
        ) : (
          <div className="mt-1 space-y-0.5">
            <p className="text-[10px] text-muted-foreground">1. Select a project &amp; click/drag days to schedule it</p>
            <p className="text-[10px] text-muted-foreground">2. Drag resources below onto the project card</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1">

          {/* Projects */}
          <div className="pb-2">
            <SidebarSection
              label="Projects" icon={<FolderKanban className="h-3 w-3" />}
              search={projSearch} onSearch={setProjSearch} searchPlaceholder="Search projects…"
              open={projOpen} onToggle={() => setProjOpen((v) => !v)}
            >
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "project", id: p.id }))}
                  onClick={() => setSelectedProjectId(selectedProjectId === p.id ? "" : p.id)}
                  className={[
                    "flex items-center gap-2 rounded px-1.5 py-1 cursor-grab active:cursor-grabbing text-xs select-none transition-colors",
                    selectedProjectId === p.id ? "bg-primary/15 text-primary" : "hover:bg-muted/60",
                  ].join(" ")}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{p.name}</span>
                  {p.city && <span className="text-[10px] text-muted-foreground shrink-0">{p.city}</span>}
                </div>
              ))}
              {filteredProjects.length === 0 && <NoMatches />}
            </SidebarSection>
          </div>

          <Separator />

          {/* Employees */}
          <SidebarSection
            label="Employees" icon={<Users className="h-3 w-3" />}
            search={empSearch} onSearch={setEmpSearch} searchPlaceholder="Search employees…"
            open={empOpen} onToggle={() => setEmpOpen((v) => !v)}
          >
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "employee", id: emp.id }))}
                className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/60 cursor-grab active:cursor-grabbing text-xs select-none"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold shrink-0">
                  {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{emp.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{emp.role}</span>
              </div>
            ))}
            {filteredEmployees.length === 0 && <NoMatches />}
          </SidebarSection>

          <Separator />

          {/* Equipment */}
          <SidebarSection
            label="Equipment" icon={<Wrench className="h-3 w-3" />}
            search={eqSearch} onSearch={setEqSearch} searchPlaceholder="Search equipment…"
            open={eqOpen} onToggle={() => setEqOpen((v) => !v)}
          >
            {filteredEquipment.map((eq) => <DraggableRow key={eq.id} id={eq.id} type="equipment" label={eq.name} />)}
            {filteredEquipment.length === 0 && <NoMatches />}
          </SidebarSection>

          <Separator />

          {/* Attachments */}
          <SidebarSection
            label="Attachments" icon={<Paperclip className="h-3 w-3" />}
            search={attSearch} onSearch={setAttSearch} searchPlaceholder="Search attachments…"
            open={attOpen} onToggle={() => setAttOpen((v) => !v)}
          >
            {filteredAttachments.map((att) => <DraggableRow key={att.id} id={att.id} type="attachment" label={att.name} />)}
            {filteredAttachments.length === 0 && <NoMatches />}
          </SidebarSection>

          <Separator />

          {/* Tools */}
          <SidebarSection
            label="Tools" icon={<Hammer className="h-3 w-3" />}
            search={tlSearch} onSearch={setTlSearch} searchPlaceholder="Search tools…"
            open={tlOpen} onToggle={() => setTlOpen((v) => !v)}
          >
            {filteredTools.map((tl) => <DraggableRow key={tl.id} id={tl.id} type="tool" label={tl.name} />)}
            {filteredTools.length === 0 && <NoMatches />}
          </SidebarSection>

        </div>
      </ScrollArea>
    </div>
  );
}
