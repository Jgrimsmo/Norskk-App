"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Search,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
  useFormSubmissions,
  useFormTemplates,
  useProjects,
} from "@/hooks/use-firestore";
import type {
  FormSubmission,
  FormTemplate,
  FormField,
} from "@/lib/types/time-tracking";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "default" },
  reviewed: { label: "Reviewed", variant: "secondary" },
};

// ── Submission Detail Dialog ──
function SubmissionDetailDialog({
  submission,
  template,
  projectName,
  open,
  onClose,
}: {
  submission: FormSubmission;
  template?: FormTemplate;
  projectName: string;
  open: boolean;
  onClose: () => void;
}) {
  const allFields: FormField[] = template?.sections.flatMap((s) => s.fields) || [];

  const renderValue = (field: FormField, value: unknown) => {
    if (value === undefined || value === null || value === "") return <span className="text-muted-foreground">—</span>;
    if (field.type === "toggle") return value === true || value === "true" || value === "yes" ? "Yes" : "No";
    if (field.type === "photo" && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {(value as string[]).map((url, i) => (
            <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded object-cover border" />
          ))}
        </div>
      );
    }
    if (field.type === "signature" && typeof value === "string" && value) {
      return <img src={value} alt="Signature" className="max-h-16 mt-1" />;
    }
    if (Array.isArray(value)) {
      const labels = (value as string[]).map((v) => {
        const opt = field.options?.find((o) => o.value === v);
        return opt?.label || v;
      });
      return labels.join(", ");
    }
    if (field.type === "select" || field.type === "radio") {
      const opt = field.options?.find((o) => o.value === String(value));
      return opt?.label || String(value);
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submission.templateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Submitted By</span>
              <p className="font-medium">{submission.submittedByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Date</span>
              <p className="font-medium">{submission.date}</p>
            </div>
            {projectName && (
              <div>
                <span className="text-muted-foreground text-xs">Project</span>
                <p className="font-medium">{projectName}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <p className="font-medium capitalize">{submission.status}</p>
            </div>
          </div>

          <Separator />

          {template?.sections.map((section) => (
            <div key={section.id}>
              {section.title && (
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {section.title}
                </h4>
              )}
              <div className="space-y-2">
                {section.fields
                  .filter((f) => !["section-header", "label"].includes(f.type))
                  .map((field) => (
                    <div key={field.id}>
                      <span className="text-xs text-muted-foreground">{field.label}</span>
                      <div className="text-sm font-medium">
                        {renderValue(field, submission.values[field.id])}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Submissions Table ──
export function SubmissionsTable() {
  const { data: submissions, update, remove } = useFormSubmissions();
  const { data: templates } = useFormTemplates();
  const { data: projects } = useProjects();
  const [search, setSearch] = React.useState("");
  const [templateFilter, setTemplateFilter] = React.useState("all");
  const [viewingSub, setViewingSub] = React.useState<FormSubmission | null>(null);

  const templateMap = React.useMemo(() => {
    const map = new Map<string, FormTemplate>();
    for (const t of templates) map.set(t.id, t);
    return map;
  }, [templates]);

  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const activeTemplates = React.useMemo(
    () => templates.filter((t) => submissions.some((s) => s.templateId === t.id)),
    [templates, submissions]
  );

  const filtered = React.useMemo(() => {
    let list = submissions;
    if (templateFilter !== "all") {
      list = list.filter((s) => s.templateId === templateFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.templateName.toLowerCase().includes(q) ||
          s.submittedByName.toLowerCase().includes(q) ||
          (s.projectId ? (projectMap.get(s.projectId) ?? "") : "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [submissions, templateFilter, search, projectMap]);

  const handleMarkReviewed = async (sub: FormSubmission) => {
    await update(sub.id, { status: "reviewed", updatedAt: new Date().toISOString() });
    toast.success("Marked as reviewed.");
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success("Submission deleted.");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {activeTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">No submissions yet</h3>
          <p className="text-sm text-muted-foreground">
            Form submissions from the field will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="hidden sm:table-cell">Project</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const badge = STATUS_BADGES[sub.status] || STATUS_BADGES.submitted;
                return (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer"
                    onClick={() => setViewingSub(sub)}
                  >
                    <TableCell className="font-medium">{sub.templateName}</TableCell>
                    <TableCell>{sub.submittedByName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {sub.projectId ? (projectMap.get(sub.projectId) ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {sub.date ? format(parseISO(sub.date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setViewingSub(sub)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          {sub.status === "submitted" && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleMarkReviewed(sub)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark Reviewed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive cursor-pointer"
                            onClick={() => handleDelete(sub.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      {viewingSub && (
        <SubmissionDetailDialog
          submission={viewingSub}
          template={templateMap.get(viewingSub.templateId)}
          projectName={viewingSub.projectId ? (projectMap.get(viewingSub.projectId) ?? "") : ""}
          open={!!viewingSub}
          onClose={() => setViewingSub(null)}
        />
      )}
    </div>
  );
}
