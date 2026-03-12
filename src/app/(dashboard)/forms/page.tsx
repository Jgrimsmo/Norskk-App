"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { RequirePermission } from "@/components/require-permission";
import { FormsTemplatesTable } from "@/components/forms/forms-templates-table";
import { SubmissionsTable } from "@/components/forms/submissions-table";
import { TemplateBuilder } from "@/components/forms/template-builder";
import { FormRenderer } from "@/components/forms/form-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormTemplates } from "@/hooks/use-firestore";
import type { FormTemplate, FormSubmission } from "@/lib/types/time-tracking";

type View =
  | { mode: "list" }
  | { mode: "builder"; templateId?: string }
  | { mode: "fill"; template: FormTemplate; existingSubmission?: FormSubmission };

export default function FormsPage() {
  const [view, setView] = React.useState<View>({ mode: "list" });
  const [tab, setTab] = React.useState<"entries" | "templates">("entries");
  const { data: templates } = useFormTemplates();

  const activeTemplates = React.useMemo(
    () => templates.filter((t) => t.status === "active"),
    [templates]
  );

  // ── Fill view ──
  if (view.mode === "fill") {
    return (
      <RequirePermission permission="forms.view">
        <FormRenderer
          template={view.template}
          existingSubmission={view.existingSubmission}
          onBack={() => setView({ mode: "list" })}
        />
      </RequirePermission>
    );
  }

  return (
    <RequirePermission permission="forms.view">
      <div className="space-y-6">
        {view.mode === "list" ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Forms
                </h1>
                <p className="text-muted-foreground">
                  Manage form templates and view entries.
                </p>
              </div>

              {activeTemplates.length === 1 ? (
                <Button
                  size="sm"
                  className="gap-1.5 cursor-pointer"
                  onClick={() => setView({ mode: "fill", template: activeTemplates[0] })}
                >
                  <Plus className="h-4 w-4" />
                  New {activeTemplates[0].name}
                </Button>
              ) : activeTemplates.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1.5 cursor-pointer">
                      <Plus className="h-4 w-4" />
                      New Form
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {activeTemplates.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setView({ mode: "fill", template: t })}
                      >
                        {t.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            {/* Tabs */}
            <div className="flex rounded-md border bg-muted/30 overflow-hidden text-sm w-fit">
              {(["entries", "templates"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 capitalize transition-colors cursor-pointer ${
                    tab === t
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "templates" ? (
              <FormsTemplatesTable
                onCreateTemplate={() => setView({ mode: "builder" })}
                onEditTemplate={(id) => setView({ mode: "builder", templateId: id })}
              />
            ) : (
              <SubmissionsTable />
            )}
          </>
        ) : (
          <TemplateBuilder
            templateId={view.templateId}
            onBack={() => setView({ mode: "list" })}
          />
        )}
      </div>
    </RequirePermission>
  );
}
