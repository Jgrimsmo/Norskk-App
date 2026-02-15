"use client";

import * as React from "react";
import {
  Users,
  Loader2,
  Mail,
  Shield,
  Pencil,
  Check,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";

import { useEmployees } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import type { Employee } from "@/lib/types/time-tracking";

// ── Role options ──
const ROLES = [
  "Admin",
  "Foreman",
  "Operator",
  "Labourer",
  "Safety Officer",
  "PM",
] as const;

const roleColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-800 border-purple-200",
  Foreman: "bg-blue-100 text-blue-800 border-blue-200",
  Operator: "bg-amber-100 text-amber-800 border-amber-200",
  Labourer: "bg-gray-100 text-gray-700 border-gray-200",
  "Safety Officer": "bg-green-100 text-green-800 border-green-200",
  PM: "bg-teal-100 text-teal-800 border-teal-200",
};

export function UserManagementSettings() {
  const { data: employees, loading, add, update, remove } = useEmployees();
  const { user } = useAuth();

  // Inline editing
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<Employee>>({});

  // Add user dialog
  const [adding, setAdding] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    name: "",
    email: "",
    phone: "",
    role: "Labourer",
    status: "active" as "active" | "inactive",
  });

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({
      name: emp.name,
      role: emp.role,
      phone: emp.phone,
      email: emp.email,
      status: emp.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await update(editingId, editForm);
      toast.success("User updated");
      setEditingId(null);
      setEditForm({});
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleAdd = async () => {
    if (!newUser.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await add({
        id: `emp-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
      });
      toast.success("User added");
      setAdding(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "Labourer",
        status: "active",
      });
    } catch {
      toast.error("Failed to add user");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sorted = [...employees].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members and assign roles.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </Button>
      </div>

      <Separator />

      {/* Current user info */}
      {user && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {user.displayName
              ?.split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "??"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {user.displayName || "Unknown"}{" "}
              <span className="text-muted-foreground font-normal">(you)</span>
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] bg-green-100 text-green-800 border-green-200"
          >
            Signed In
          </Badge>
        </div>
      )}

      {/* Add user form */}
      {adding && (
        <div className="rounded-lg border p-4 space-y-3 bg-card">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New User
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={newUser.name}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="John Doe"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="john@company.ca"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newUser.phone}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="(780) 555-0100"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) =>
                  setNewUser((p) => ({ ...p, role: v }))
                }
              >
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="text-xs">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={handleAdd}
            >
              Add User
            </Button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((emp) => {
              const isEditing = editingId === emp.id;
              return (
                <TableRow key={emp.id}>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="font-medium">{emp.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.email || ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {emp.email || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Input
                        value={editForm.phone || ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {emp.phone || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Select
                        value={editForm.role || ""}
                        onValueChange={(v) =>
                          setEditForm((p) => ({ ...p, role: v }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${roleColors[emp.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                      >
                        {emp.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <Select
                        value={editForm.status || ""}
                        onValueChange={(v) =>
                          setEditForm((p) => ({
                            ...p,
                            status: v as "active" | "inactive",
                          }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">
                            Active
                          </SelectItem>
                          <SelectItem value="inactive" className="text-xs">
                            Inactive
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${
                          emp.status === "active"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {emp.status}
                      </Badge>
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
                            onClick={() => startEdit(emp)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteConfirmButton
                            onConfirm={() => handleDelete(emp.id)}
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
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  No users yet. Click "Add User" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        <Shield className="h-3 w-3 inline mr-1" />
        Users listed here match the Employees table. Changes here are reflected
        throughout the app.
      </p>
    </div>
  );
}
