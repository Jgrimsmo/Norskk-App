"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Search,
  FileCheck,
  Archive,
  MoreHorizontal,
  Pencil,
  Copy,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { useFormTemplates, useFormSubmissions } from "@/hooks/use-firestore";
import type { FormTemplate } from "@/lib/types/time-tracking";

interface FormsTemplatesTableProps {
  onCreateTemplate: () => void;
  onEditTemplate: (id: string) => void;
}

export function FormsTemplatesTable({ onCreateTemplate, onEditTemplate }: FormsTemplatesTableProps) {
  const { data: templates, update, remove, add } = useFormTemplates();
  const { data: submissions } = useFormSubmissions();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "archived">("active");

  const filtered = React.useMemo(() => {
    let list = templates;
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, search, statusFilter]);

  const submissionCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) {
      map.set(s.templateId, (map.get(s.templateId) || 0) + 1);
    }
    return map;
  }, [submissions]);

  const totalFieldCount = (t: FormTemplate) =>
    t.sections.reduce((sum, s) => sum + s.fields.length, 0);

  const handleArchive = async (template: FormTemplate) => {
    const newStatus = template.status === "active" ? "archived" : "active";
    await update(template.id, { status: newStatus });
    toast.success(`Template ${newStatus === "archived" ? "archived" : "restored"}.`);
  };

  const handleDuplicate = async (template: FormTemplate) => {
    const copy: FormTemplate = {
      ...template,
      id: `form-${crypto.randomUUID().slice(0, 10)}`,
      name: `${template.name} (copy)`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await add(copy);
    toast.success("Template duplicated.");
  };

  const handleDelete = async (id: string) => {
    const count = submissionCountMap.get(id) || 0;
    if (count > 0) {
      toast.error("Cannot delete a template with existing submissions. Archive it instead.");
      return;
    }
    await remove(id);
    toast.success("Template deleted.");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-muted/30 overflow-hidden text-xs">
            {(["active", "archived", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-foreground text-background font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button className="gap-1.5 cursor-pointer" onClick={onCreateTemplate}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">No templates found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {statusFilter === "archived"
              ? "No archived templates."
              : "Create your first form template to get started."}
          </p>
          {statusFilter !== "archived" && (
            <Button className="gap-1.5 cursor-pointer" onClick={onCreateTemplate}>
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Fields</TableHead>
                <TableHead className="hidden md:table-cell">Submissions</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => onEditTemplate(t.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      {t.status === "archived" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Archived
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {t.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {totalFieldCount(t)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {submissionCountMap.get(t.id) || 0}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {t.updatedAt ? format(parseISO(t.updatedAt), "MMM d, yyyy") : "—"}
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
                          onClick={() => onEditTemplate(t.id)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleDuplicate(t)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleArchive(t)}
                        >
                          <Archive className="h-3.5 w-3.5 mr-2" />
                          {t.status === "active" ? "Archive" : "Restore"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
