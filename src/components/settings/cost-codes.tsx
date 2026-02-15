"use client";

import * as React from "react";
import {
  Hash,
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

import { useCostCodes } from "@/hooks/use-firestore";
import type { CostCode } from "@/lib/types/time-tracking";

export function CostCodesSettings() {
  const { data: costCodes, loading, add, update, remove } = useCostCodes();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ code: "", description: "" });

  // Add new
  const [adding, setAdding] = React.useState(false);
  const [newCode, setNewCode] = React.useState({ code: "", description: "" });

  const filtered = costCodes.filter((cc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cc.code.toLowerCase().includes(q) ||
      cc.description.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => a.code.localeCompare(b.code));

  const startEdit = (cc: CostCode) => {
    setEditingId(cc.id);
    setEditForm({ code: cc.code, description: cc.description });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ code: "", description: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.code.trim()) {
      toast.error("Code is required");
      return;
    }
    try {
      await update(editingId, editForm);
      toast.success("Cost code updated");
      cancelEdit();
    } catch {
      toast.error("Failed to update cost code");
    }
  };

  const handleAdd = async () => {
    if (!newCode.code.trim()) {
      toast.error("Code is required");
      return;
    }
    // Check for duplicates
    if (costCodes.some((cc) => cc.code === newCode.code.trim())) {
      toast.error("A cost code with this code already exists");
      return;
    }
    try {
      await add({
        id: `cc-${crypto.randomUUID().slice(0, 8)}`,
        code: newCode.code.trim(),
        description: newCode.description.trim(),
      });
      toast.success("Cost code added");
      setAdding(false);
      setNewCode({ code: "", description: "" });
    } catch {
      toast.error("Failed to add cost code");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Cost code removed");
    } catch {
      toast.error("Failed to remove cost code");
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
            <Hash className="h-5 w-5" />
            Cost Codes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage cost codes used across projects and time entries.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Cost Code
        </Button>
      </div>

      <Separator />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cost codes…"
          className="h-8 text-xs pl-8"
        />
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border p-4 space-y-3 bg-card">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Cost Code
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input
                value={newCode.code}
                onChange={(e) =>
                  setNewCode((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="e.g. 03-100"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description *</Label>
              <Input
                value={newCode.description}
                onChange={(e) =>
                  setNewCode((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g. Concrete Forming"
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
                setNewCode({ code: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={handleAdd}
            >
              Add Cost Code
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[140px]">Code</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((cc) => {
              const isEditing = editingId === cc.id;
              return (
                <TableRow key={cc.id}>
                  <TableCell className="text-xs font-mono">
                    {isEditing ? (
                      <Input
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, code: e.target.value }))
                        }
                        className="h-7 text-xs font-mono"
                      />
                    ) : (
                      <span className="font-medium text-primary">
                        {cc.code}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {cc.description}
                      </span>
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
                            onClick={() => startEdit(cc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteConfirmButton
                            onConfirm={() => handleDelete(cc.id)}
                          />
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
                  colSpan={3}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  {searchQuery
                    ? "No cost codes match your search."
                    : "No cost codes yet. Click \"Add Cost Code\" to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {costCodes.length} cost code{costCodes.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}
