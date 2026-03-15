"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  FileCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  HardHat,
  Wrench,
  User,
  FolderOpen,
  Share2,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/field/pull-to-refresh";
import { FormRenderer } from "@/components/forms/form-renderer";

import {
  useFormTemplates,
  useFormSubmissions,
  useProjects,
  useEquipment,
  useEmployees,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { useSourceLabelMap } from "@/hooks/use-source-label-map";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useSharePDF } from "@/hooks/use-share-pdf";
import { generateFormSubmissionPDFBlobUrl } from "@/lib/export/react-pdf/form-submission";
import type { FormTemplate, FormSubmission } from "@/lib/types/time-tracking";

type View =
  | { mode: "list" }
  | { mode: "fill"; template: FormTemplate; existingSubmission?: FormSubmission };

type SubTab = "my-forms" | "safety" | "equipment" | "general";

export function FieldForms() {
  const { user } = useAuth();
  const { data: templates, refresh: refreshT } = useFormTemplates();
  const { data: submissions, refresh: refreshS } = useFormSubmissions();
  const { data: projects } = useProjects();
  const { data: allEquipment } = useEquipment();
  const { data: employees } = useEmployees();
  const { data: allAttachments } = useAttachments();
  const { data: allTools } = useTools();
  const { profile: company } = useCompanyProfile();
  const { sharePDF, sharing } = useSharePDF();
  const [view, setView] = React.useState<View>({ mode: "list" });
  const [subTab, setSubTab] = React.useState<SubTab>("my-forms");

  // Drill-down state for Safety (project) and Equipment
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = React.useState<string | null>(null);

  const activeTemplates = templates.filter((t) => t.status === "active");

  /** Group active templates by category in display order */
  const CATEGORY_ORDER = ["safety", "equipment", "employee", "general"] as const;
  const CATEGORY_LABELS: Record<string, string> = {
    safety: "Safety",
    equipment: "Equipment",
    employee: "Employee",
    general: "General",
  };
  const groupedTemplates = React.useMemo(() => {
    const groups: { category: string; label: string; items: FormTemplate[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = activeTemplates.filter((t) => t.category === cat);
      if (items.length > 0) groups.push({ category: cat, label: CATEGORY_LABELS[cat] ?? cat, items });
    }
    const known = new Set<string>(CATEGORY_ORDER);
    const other = activeTemplates.filter((t) => !known.has(t.category));
    if (other.length > 0) groups.push({ category: "other", label: "Other", items: other });
    return groups;
  }, [activeTemplates]);

  // Template map for looking up template from submission
  const templateMap = React.useMemo(() => {
    const m = new Map<string, FormTemplate>();
    for (const t of templates) m.set(t.id, t);
    return m;
  }, [templates]);

  // Equipment map
  const equipmentMap = React.useMemo(() => {
    const m = new Map<string, { name: string; number: string }>();
    for (const e of allEquipment) {
      if (e.id !== EQUIPMENT_NONE_ID) m.set(e.id, { name: e.name, number: e.number });
    }
    return m;
  }, [allEquipment]);

  // Project map
  const projectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  // ── Filtered submission lists ──
  const myForms = React.useMemo(
    () =>
      submissions
        .filter((s) => s.submittedById === user?.uid)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [submissions, user?.uid]
  );

  const safetySubmissions = React.useMemo(
    () => submissions.filter((s) => s.category === "safety").sort((a, b) => b.date.localeCompare(a.date)),
    [submissions]
  );

  const equipmentSubmissions = React.useMemo(
    () => submissions.filter((s) => s.category === "equipment").sort((a, b) => b.date.localeCompare(a.date)),
    [submissions]
  );

  const generalSubmissions = React.useMemo(
    () => submissions.filter((s) => s.category === "general").sort((a, b) => b.date.localeCompare(a.date)),
    [submissions]
  );

  // Safety: unique projects that have safety submissions
  const safetyProjects = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of safetySubmissions) {
      if (s.projectId) ids.add(s.projectId);
      if (s.linkedProjectIds) for (const id of s.linkedProjectIds) ids.add(id);
    }
    return Array.from(ids)
      .map((id) => ({ id, name: projectMap.get(id) || "Unknown Project" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [safetySubmissions, projectMap]);

  // Equipment: unique equipment that have equipment submissions
  const linkedEquipment = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of equipmentSubmissions) {
      if (s.equipmentId) ids.add(s.equipmentId);
      if (s.linkedEquipmentIds) for (const id of s.linkedEquipmentIds) ids.add(id);
    }
    return Array.from(ids)
      .map((id) => {
        const eq = equipmentMap.get(id);
        return { id, label: eq ? (eq.number ? `${eq.name} #${eq.number}` : eq.name) : "Unknown Equipment" };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [equipmentSubmissions, equipmentMap]);

  // Drill-down filtered lists
  const safetyForProject = React.useMemo(
    () =>
      selectedProjectId
        ? safetySubmissions.filter(
            (s) => s.projectId === selectedProjectId || s.linkedProjectIds?.includes(selectedProjectId)
          )
        : [],
    [safetySubmissions, selectedProjectId]
  );

  const formsForEquipment = React.useMemo(
    () =>
      selectedEquipmentId
        ? equipmentSubmissions.filter((s) => s.equipmentId === selectedEquipmentId || s.linkedEquipmentIds?.includes(selectedEquipmentId))
        : [],
    [equipmentSubmissions, selectedEquipmentId]
  );

  const projectName = (id: string) => projectMap.get(id) || "";

  const sourceLabelMap = useSourceLabelMap(employees, projects, allEquipment, allAttachments, allTools);

  const handleShareSubmission = (sub: FormSubmission) => {
    const tpl = templateMap.get(sub.templateId);
    if (!tpl) return;
    const proj = sub.projectId ? projects.find((p) => p.id === sub.projectId) : undefined;
    const equip = sub.equipmentId ? allEquipment.find((e) => e.id === sub.equipmentId) : undefined;
    const projectAddress = proj
      ? [proj.address, proj.city, proj.province].filter(Boolean).join(", ")
      : undefined;
    const safeName = (sub.templateName || "form").replace(/[^a-zA-Z0-9-_]/g, "_");
    sharePDF(
      () => generateFormSubmissionPDFBlobUrl({
        name: sub.templateName,
        description: tpl.description,
        sections: tpl.sections,
        values: sub.values,
        requireSignature: tpl.requireSignature,
        signatureDataUrl: sub.signatureUrl,
        company,
        sourceLabelMap,
        projectName: proj?.name,
        projectAddress,
        equipmentName: equip ? (equip.number ? `${equip.name} #${equip.number}` : equip.name) : undefined,
      }),
      `${safeName}-${sub.date}.pdf`,
    );
  };

  const handleRefresh = async () => {
    await Promise.all([refreshT(), refreshS()]);
  };

  const handleOpenSubmission = (sub: FormSubmission) => {
    const tpl = templateMap.get(sub.templateId);
    if (tpl) setView({ mode: "fill", template: tpl, existingSubmission: sub });
  };

  if (view.mode === "fill") {
    return (
      <FormRenderer
        template={view.template}
        existingSubmission={view.existingSubmission}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  // ── Helpers for rendering submission cards ──
  const SubmissionCard = ({ sub }: { sub: FormSubmission }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleOpenSubmission(sub)}
        className="flex-1 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted/50 active:scale-[0.99] transition-all cursor-pointer min-w-0"
      >
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{sub.templateName}</div>
          <div className="text-xs text-muted-foreground">
            {sub.date ? format(parseISO(sub.date), "MMM d, yyyy") : ""}
            {sub.projectId ? ` · ${projectName(sub.projectId)}` : ""}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{sub.submittedByName}</div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      <button
        onClick={() => handleShareSubmission(sub)}
        disabled={sharing}
        className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border bg-card hover:bg-muted/50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        title="Share PDF"
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Share2 className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );

  const BackButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-primary font-medium mb-3 cursor-pointer hover:underline"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
      {message}
    </div>
  );

  // ── Sub-tab content renderers ──
  const renderMyForms = () => (
    myForms.length === 0 ? (
      <EmptyState message="No submissions yet." />
    ) : (
      <div className="space-y-2">
        {myForms.map((sub) => (
          <SubmissionCard key={sub.id} sub={sub} />
        ))}
      </div>
    )
  );

  const renderSafety = () => {
    // Drill into a specific project
    if (selectedProjectId) {
      const pName = projectMap.get(selectedProjectId) || "Project";
      return (
        <div>
          <BackButton onClick={() => setSelectedProjectId(null)} label="All Projects" />
          <h3 className="text-sm font-semibold mb-2">{pName}</h3>
          {safetyForProject.length === 0 ? (
            <EmptyState message="No safety forms for this project." />
          ) : (
            <div className="space-y-2">
              {safetyForProject.map((sub) => (
                <SubmissionCard key={sub.id} sub={sub} />
              ))}
            </div>
          )}
        </div>
      );
    }
    // Project list
    return safetyProjects.length === 0 ? (
      <EmptyState message="No safety submissions yet." />
    ) : (
      <div className="space-y-2">
        {safetyProjects.map((p) => {
          const count = safetySubmissions.filter(
            (s) => s.projectId === p.id || s.linkedProjectIds?.includes(p.id)
          ).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted/50 active:scale-[0.99] transition-all cursor-pointer"
            >
              <HardHat className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{p.name}</div>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {count} form{count !== 1 ? "s" : ""}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    );
  };

  const renderEquipment = () => {
    // Drill into a specific piece of equipment
    if (selectedEquipmentId) {
      const eqLabel = (() => {
        const eq = equipmentMap.get(selectedEquipmentId);
        return eq ? (eq.number ? `${eq.name} #${eq.number}` : eq.name) : "Equipment";
      })();
      return (
        <div>
          <BackButton onClick={() => setSelectedEquipmentId(null)} label="All Equipment" />
          <h3 className="text-sm font-semibold mb-2">{eqLabel}</h3>
          {formsForEquipment.length === 0 ? (
            <EmptyState message="No forms for this equipment." />
          ) : (
            <div className="space-y-2">
              {formsForEquipment.map((sub) => (
                <SubmissionCard key={sub.id} sub={sub} />
              ))}
            </div>
          )}
        </div>
      );
    }
    // Equipment list
    return linkedEquipment.length === 0 ? (
      <EmptyState message="No equipment submissions yet." />
    ) : (
      <div className="space-y-2">
        {linkedEquipment.map((eq) => {
          const count = equipmentSubmissions.filter(
            (s) => s.linkedEquipmentIds?.includes(eq.id)
          ).length;
          return (
            <button
              key={eq.id}
              onClick={() => setSelectedEquipmentId(eq.id)}
              className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted/50 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Wrench className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{eq.label}</div>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {count} form{count !== 1 ? "s" : ""}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    );
  };

  const renderGeneral = () => (
    generalSubmissions.length === 0 ? (
      <EmptyState message="No general submissions yet." />
    ) : (
      <div className="space-y-2">
        {generalSubmissions.map((sub) => (
          <SubmissionCard key={sub.id} sub={sub} />
        ))}
      </div>
    )
  );

  const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "my-forms", label: "My Forms", icon: <User className="h-3.5 w-3.5" /> },
    { key: "safety", label: "Safety", icon: <HardHat className="h-3.5 w-3.5" /> },
    { key: "equipment", label: "Equipment", icon: <Wrench className="h-3.5 w-3.5" /> },
    { key: "general", label: "General", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-20">
        {/* Active forms grouped by category */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Fill a Form
          </h2>
          {groupedTemplates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No forms available.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTemplates.map((group) => (
                <div key={group.category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setView({ mode: "fill", template: t })}
                        className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted/50 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <FileCheck className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{t.name}</div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions browser */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Submissions
          </h2>

          {/* Category tabs */}
          <div className="flex rounded-md border bg-muted/30 overflow-hidden text-xs w-full mb-4">
            {SUB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setSubTab(t.key);
                  setSelectedProjectId(null);
                  setSelectedEquipmentId(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 transition-colors cursor-pointer ${
                  subTab === t.key
                    ? "bg-foreground text-background font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {subTab === "my-forms" && renderMyForms()}
          {subTab === "safety" && renderSafety()}
          {subTab === "equipment" && renderEquipment()}
          {subTab === "general" && renderGeneral()}
        </div>
      </div>
    </PullToRefresh>
  );
}
