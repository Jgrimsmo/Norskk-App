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

import { useDevelopers } from "@/hooks/use-firestore";
import type { Developer } from "@/lib/types/time-tracking";

export function DevelopersTable() {
  const { data: developers, loading, add, update, remove } = useDevelopers();

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
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search developers…"
          className="h-8 text-xs pl-8"
        />
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Company Name</TableHead>
              <TableHead className="text-xs">Contact</TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((d) => {
              const isEditing = editingId === d.id;
              return (
                <TableRow key={d.id}>
                  <TableCell className="text-xs font-medium">
                    {isEditing ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="font-semibold">{d.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.contact}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, contact: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">{d.contact ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">{d.phone ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">{d.email ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground py-8"
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

      <p className="text-xs text-muted-foreground">
        {developers.length} developer{developers.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}
