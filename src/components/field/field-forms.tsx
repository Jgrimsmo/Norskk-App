"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  FileCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/field/pull-to-refresh";
import { FormRenderer } from "@/components/forms/form-renderer";

import {
  useFormTemplates,
  useFormSubmissions,
  useProjects,
} from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import type { FormTemplate, FormSubmission } from "@/lib/types/time-tracking";

type View = { mode: "list" } | { mode: "fill"; template: FormTemplate };

export function FieldForms() {
  const { user } = useAuth();
  const { data: templates, loading: loadingT, refresh: refreshT } = useFormTemplates();
  const { data: submissions, loading: loadingS, refresh: refreshS } = useFormSubmissions();
  const { data: projects } = useProjects();
  const [view, setView] = React.useState<View>({ mode: "list" });

  const activeTemplates = templates.filter((t) => t.status === "active");

  const mySubmissions = React.useMemo(
    () =>
      submissions
        .filter((s) => s.submittedById === user?.uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [submissions, user?.uid]
  );

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || "";

  const handleRefresh = async () => {
    await Promise.all([refreshT(), refreshS()]);
  };

  if (view.mode === "fill") {
    return (
      <FormRenderer
        template={view.template}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-20">
        {/* Active forms to fill */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Fill a Form
          </h2>
          {activeTemplates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No forms available.
            </div>
          ) : (
            <div className="space-y-2">
              {activeTemplates.map((t) => (
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
                  <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                    {t.category}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent submissions */}
        {mySubmissions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Recent Submissions
            </h2>
            <div className="space-y-2">
              {mySubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  {sub.status === "reviewed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{sub.templateName}</div>
                    <div className="text-xs text-muted-foreground">
                      {sub.date ? format(parseISO(sub.date), "MMM d, yyyy") : ""}
                      {sub.projectId ? ` · ${projectName(sub.projectId)}` : ""}
                    </div>
                  </div>
                  <Badge
                    variant={sub.status === "reviewed" ? "secondary" : "outline"}
                    className="text-[10px] capitalize shrink-0"
                  >
                    {sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
