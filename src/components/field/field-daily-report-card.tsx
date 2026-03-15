"use client";

import { format, parseISO } from "date-fns";
import { Loader2, Share2 } from "lucide-react";

import type { DailyReport, Employee, Project } from "@/lib/types/time-tracking";

export function DailyReportCard({
  report,
  projects,
  employees,
  currentEmployeeId,
  showAuthor = false,
  onOpen,
  onShare,
  sharing,
}: {
  report: DailyReport;
  projects: Project[];
  employees: Employee[];
  currentEmployeeId: string;
  showAuthor?: boolean;
  onOpen: (r: DailyReport) => void;
  onShare: (r: DailyReport) => void;
  sharing: boolean;
}) {
  const proj = projects.find((p) => p.id === report.projectId);
  const author = employees.find((e) => e.id === report.authorId);
  const isOwn = report.authorId === currentEmployeeId;

  return (
    <div className="flex items-stretch gap-2">
      <button
        onClick={() => onOpen(report)}
        className={`flex-1 rounded-xl border shadow-sm p-4 text-left cursor-pointer transition-colors min-w-0 ${
          isOwn
            ? "bg-card hover:bg-muted/40 active:bg-muted/60"
            : "bg-muted/30 hover:bg-muted/50 active:bg-muted/70"
        }`}
      >
        <div className="flex items-start justify-between mb-1">
          <span className="text-sm font-semibold">
            {proj ? proj.name : "No project"}
          </span>
          {isOwn && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {showAuthor && (author ? `${author.name} · ` : "")}
          {format(parseISO(report.date), "MMM d, yyyy")}
          {report.time && ` · ${report.time}`}
          {report.onSiteStaff.length > 0 && ` · ${report.onSiteStaff.length} staff`}
        </p>
        {report.workDescription && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {report.workDescription}
          </p>
        )}
      </button>
      <button
        onClick={() => onShare(report)}
        disabled={sharing}
        className="shrink-0 flex items-center justify-center w-10 rounded-xl border bg-card hover:bg-muted/50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        title="Share PDF"
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Share2 className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
