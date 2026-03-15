"use client";

import * as React from "react";
import {
  Building,
  Loader2,
  Plus,
  Pencil,
  Check,
  X,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { useTableColumns, type ColumnDef } from "@/hooks/use-table-columns";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { ColumnSettings } from "@/components/shared/column-settings";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableActions, type TableAction } from "@/components/shared/table-actions";
import { Checkbox } from "@/components/ui/checkbox";

import { useDevelopers } from "@/hooks/use-firestore";
import type { Developer } from "@/lib/types/time-tracking";

// ── Column definitions for settings ──
const DEVELOPER_COLUMN_DEFS: ColumnDef[] = [
  { id: "name", label: "Company Name", alwaysVisible: true },
  { id: "contact", label: "Contact" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
];

export function DevelopersTable() {
  const { data: developers, loading, add, update, remove } = useDevelopers();

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, reset: resetColumns } =
    useTableColumns("developers-columns", DEVELOPER_COLUMN_DEFS);

  // ── Row selection ──
  const {
    selected,
    count: selectedCount,
    isSelected,
    toggle: toggleSelection,
    selectAll,
    deselectAll,
    allSelected,
  } = useRowSelection();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
  });

  const [adding, setAdding] = React.useState(false);
  const [newDev, setNewDev] = React.useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
  });

  const filtered = developers.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.contact ?? "").toLowerCase().includes(q) ||
      (d.email ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(sorted);

  // ── Table actions ──
  const handleBulkDelete = React.useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} developer(s)?`)) return;
    for (const id of selected) {
      try { await remove(id); } catch { /* skip */ }
    }
    deselectAll();
  }, [selected, remove, deselectAll]);

  const tableActions: TableAction[] = React.useMemo(
    () => [
      {
        label: "Delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: handleBulkDelete,
        destructive: true,
      },
    ],
    [handleBulkDelete]
  );

  // ── Edit ──────────────────────────────────
  const startEdit = (d: Developer) => {
    setEditingId(d.id);
    setEditForm({
      name: d.name,
      contact: d.contact ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", contact: "", phone: "", email: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) {
      toast.error("Developer name is required");
      return;
    }
    try {
      await update(editingId, {
        name: editForm.name.trim(),
        contact: editForm.contact.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
      });
      toast.success("Developer updated");
      cancelEdit();
    } catch {
      toast.error("Failed to update developer");
    }
  };

  // ── Add ───────────────────────────────────
  const handleAdd = async () => {
    if (!newDev.name.trim()) {
      toast.error("Developer name is required");
      return;
    }
    if (developers.some((d) => d.name.toLowerCase() === newDev.name.trim().toLowerCase())) {
      toast.error("A developer with this name already exists");
      return;
    }
    try {
      await add({
        id: `dev-${crypto.randomUUID().slice(0, 8)}`,
        name: newDev.name.trim(),
        contact: newDev.contact.trim(),
        phone: newDev.phone.trim(),
        email: newDev.email.trim(),
      });
      toast.success("Developer added");
      setAdding(false);
      setNewDev({ name: "", contact: "", phone: "", email: "" });
    } catch {
      toast.error("Failed to add developer");
    }
  };

  // ── Delete ────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Developer removed");
    } catch {
      toast.error("Failed to remove developer");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5" />
            Developers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage developers available for project assignment.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Developer
        </Button>
      </div>

      <Separator />

      {/* Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search developers…"
            className="h-8 text-xs pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnSettings columns={columns} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetColumns} />
          <TableActions actions={tableActions} selectedCount={selectedCount} />
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border p-4 space-y-3 bg-card">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Developer
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={newDev.name}
                onChange={(e) => setNewDev((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Acme Developments"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Person</Label>
              <Input
                value={newDev.contact}
                onChange={(e) => setNewDev((p) => ({ ...p, contact: e.target.value }))}
                placeholder="e.g. John Smith"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newDev.phone}
                onChange={(e) => setNewDev((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. 780-555-0100"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={newDev.email}
                onChange={(e) => setNewDev((p) => ({ ...p, email: e.target.value }))}
                placeholder="e.g. john@acme.com"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => {
                setAdding(false);
                setNewDev({ name: "", contact: "", phone: "", email: "" });
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={handleAdd}>
              Add Developer
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
              <TableHead className="w-[40px] px-3">
                <Checkbox
                  checked={paginatedData.length > 0 && allSelected(paginatedData.map((d) => d.id))}
                  onCheckedChange={(checked) => { if (checked) selectAll(paginatedData.map((d) => d.id)); else deselectAll(); }}
                  aria-label="Select all"
                />
              </TableHead>
              {columns.filter((c) => c.visible).map((col) => {
                switch (col.id) {
                  case "name":
                    return <TableHead key="name" className="text-xs font-semibold px-3">Company Name</TableHead>;
                  case "contact":
                    return <TableHead key="contact" className="text-xs font-semibold px-3">Contact</TableHead>;
                  case "phone":
                    return <TableHead key="phone" className="text-xs font-semibold px-3">Phone</TableHead>;
                  case "email":
                    return <TableHead key="email" className="text-xs font-semibold px-3">Email</TableHead>;
                  default:
                    return null;
                }
              })}
              <TableHead className="text-xs font-semibold px-3 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((d) => {
              const isEditing = editingId === d.id;
              return (
                <TableRow key={d.id} className="group h-[36px] hover:bg-muted/30">
                  <TableCell className="px-3">
                    <Checkbox
                      checked={isSelected(d.id)}
                      onCheckedChange={() => toggleSelection(d.id)}
                      aria-label={`Select ${d.name}`}
                    />
                  </TableCell>
                  {columns.filter((c) => c.visible).map((col) => {
                    switch (col.id) {
                      case "name":
                        return (
                          <TableCell key="name" className="text-xs font-medium">
                    {isEditing ? (
                      <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                    ) : (
                      <span className="font-semibold">{d.name}</span>
                    )}
                          </TableCell>
                        );
                      case "contact":
                        return (
                          <TableCell key="contact" className="text-xs">
                    {isEditing ? (
                      <Input value={editForm.contact} onChange={(e) => setEditForm((p) => ({ ...p, contact: e.target.value }))} className="h-7 text-xs" />
                    ) : (
                      <span className="text-muted-foreground">{d.contact ?? "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "phone":
                        return (
                          <TableCell key="phone" className="text-xs">
                    {isEditing ? (
                      <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="h-7 text-xs" />
                    ) : (
                      <span className="text-muted-foreground">{d.phone ?? "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "email":
                        return (
                          <TableCell key="email" className="text-xs">
                    {isEditing ? (
                      <Input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="h-7 text-xs" />
                    ) : (
                      <span className="text-muted-foreground">{d.email ?? "—"}</span>
                    )}
                          </TableCell>
                        );
                      default:
                        return null;
                    }
                  })}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer text-green-600 hover:text-green-700"
                            onClick={saveEdit}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground"
                            onClick={cancelEdit}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(d)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteConfirmButton onConfirm={() => handleDelete(d.id)} />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.filter(c => c.visible).length + 2}
                  className="h-32 text-center text-muted-foreground"
                >
                  {searchQuery
                    ? "No developers match your search."
                    : 'No developers yet. Click "Add Developer" to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationBar
        selectedCount={selectedCount}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
