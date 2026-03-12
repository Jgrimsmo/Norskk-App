"use client";

import * as React from "react";
import { RequirePermission } from "@/components/require-permission";
import { FormsTemplatesTable } from "@/components/forms/forms-templates-table";
import { SubmissionsTable } from "@/components/forms/submissions-table";
import { TemplateBuilder } from "@/components/forms/template-builder";

type View = { mode: "list" } | { mode: "builder"; templateId?: string };

export default function FormsPage() {
  const [view, setView] = React.useState<View>({ mode: "list" });
  const [tab, setTab] = React.useState<"templates" | "submissions">("templates");

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
                  Manage form templates and view submissions.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex rounded-md border bg-muted/30 overflow-hidden text-sm w-fit">
              {(["templates", "submissions"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 capitalize transition-colors cursor-pointer ${
                    tab === t ? "bg-background shadow-sm font-medium" : "hover:bg-muted/50"
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
