"use client";

import * as React from "react";
import { Shield, RotateCcw, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRolePermissions } from "@/hooks/use-firestore";
import {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_TEMPLATES,
  getDefaultTemplate,
} from "@/lib/constants/permissions";

// ── Role colors (reused from user-management) ──
const roleColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-800 border-purple-200",
  Foreman: "bg-blue-100 text-blue-800 border-blue-200",
  Operator: "bg-amber-100 text-amber-800 border-amber-200",
  Labourer: "bg-gray-100 text-gray-700 border-gray-200",
  "Safety Officer": "bg-green-100 text-green-800 border-green-200",
  PM: "bg-teal-100 text-teal-800 border-teal-200",
};

const ROLES = DEFAULT_ROLE_TEMPLATES.map((t) => t.role);

export function RolePermissionsSettings() {
  const {
    data: storedRoles,
    loading,
    add,
    update,
  } = useRolePermissions();

  const [selectedRole, setSelectedRole] = React.useState<string>("Admin");
  const [localPermissions, setLocalPermissions] = React.useState<Set<string>>(
    new Set()
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load permissions when role changes
  React.useEffect(() => {
    const stored = storedRoles.find((r) => r.role === selectedRole);
    if (stored) {
      setLocalPermissions(new Set(stored.permissions));
    } else {
      const template = getDefaultTemplate(selectedRole);
      setLocalPermissions(new Set(template?.permissions ?? []));
    }
    setDirty(false);
  }, [selectedRole, storedRoles]);

  // ── Handlers ──

  const togglePermission = (permission: string) => {
    setLocalPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
    setDirty(true);
  };

  const toggleModule = (moduleId: string, actions: readonly { id: string }[]) => {
    const modulePerms = actions.map((a) => `${moduleId}.${a.id}`);
    const allChecked = modulePerms.every((p) => localPermissions.has(p));

    setLocalPermissions((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allChecked) {
          next.delete(p);
        } else {
          next.add(p);
        }
      }
      return next;
    });
    setDirty(true);
  };

  const resetToDefault = () => {
    const template = getDefaultTemplate(selectedRole);
    setLocalPermissions(new Set(template?.permissions ?? []));
    setDirty(true);
  };

  const selectAll = () => {
    setLocalPermissions(new Set(ALL_PERMISSIONS));
    setDirty(true);
  };

  const deselectAll = () => {
    setLocalPermissions(new Set());
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = storedRoles.find((r) => r.role === selectedRole);
      const template = getDefaultTemplate(selectedRole);

      if (existing) {
        await update(existing.id, {
          permissions: Array.from(localPermissions),
        });
      } else {
        await add({
          id: `role-${selectedRole.toLowerCase().replace(/\s+/g, "-")}`,
          role: selectedRole,
          permissions: Array.from(localPermissions),
          description: template?.description ?? "",
        });
      }

      toast.success(`Permissions saved for ${selectedRole}`);
      setDirty(false);
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ──

  const template = getDefaultTemplate(selectedRole);
  const totalEnabled = localPermissions.size;
  const totalPossible = ALL_PERMISSIONS.length;

  // Check if current matches default template
  const isDefault = React.useMemo(() => {
    if (!template) return false;
    const defaultSet = new Set(template.permissions);
    if (defaultSet.size !== localPermissions.size) return false;
    for (const p of localPermissions) {
      if (!defaultSet.has(p)) return false;
    }
    return true;
  }, [template, localPermissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Permissions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure what each role can see and do. Changes apply to all users
          with that role.
        </p>
      </div>

      <Separator />

      {/* Role selector + quick actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">
            Editing role:
          </span>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${roleColors[role] ?? ""}`}
                    >
                      {role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1.5"
            onClick={resetToDefault}
            disabled={isDefault}
          >
            <RotateCcw className="h-3 w-3" />
            Reset to default
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer"
            onClick={selectAll}
          >
            Select all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer"
            onClick={deselectAll}
          >
            Deselect all
          </Button>
        </div>
      </div>

      {/* Role description + stats */}
      <div className="flex items-center gap-3 text-sm">
        {template && (
          <span className="text-muted-foreground">{template.description}</span>
        )}
        <Badge variant="secondary" className="ml-auto text-xs whitespace-nowrap">
          {totalEnabled}/{totalPossible} enabled
        </Badge>
      </div>

      {/* Permission modules grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PERMISSION_MODULES.map((mod) => {
          const modulePerms = mod.actions.map((a) => `${mod.id}.${a.id}`);
          const checkedCount = modulePerms.filter((p) =>
            localPermissions.has(p)
          ).length;
          const allChecked = checkedCount === modulePerms.length;
          const someChecked = checkedCount > 0 && !allChecked;

          return (
            <div
              key={mod.id}
              className="rounded-lg border bg-card overflow-hidden"
            >
              {/* Module header */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 cursor-pointer select-none"
                onClick={() => toggleModule(mod.id, mod.actions)}
              >
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={() => toggleModule(mod.id, mod.actions)}
                  className="cursor-pointer"
                />
                <span className="text-sm font-semibold flex-1">
                  {mod.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {checkedCount}/{modulePerms.length}
                </span>
              </div>

              {/* Action rows */}
              <div className="divide-y">
                {mod.actions.map((action) => {
                  const permKey = `${mod.id}.${action.id}`;
                  const checked = localPermissions.has(permKey);

                  return (
                    <label
                      key={permKey}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePermission(permKey)}
                        className="cursor-pointer"
                      />
                      <span className="text-xs flex-1">{action.label}</span>
                      {checked && (
                        <Check className="h-3 w-3 text-green-600 shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-0 flex items-center justify-between rounded-lg border bg-card p-3 shadow-lg animate-in slide-in-from-bottom-2">
          <span className="text-sm text-muted-foreground">
            You have unsaved changes for{" "}
            <Badge
              variant="outline"
              className={`text-[10px] ${roleColors[selectedRole] ?? ""}`}
            >
              {selectedRole}
            </Badge>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => {
                const stored = storedRoles.find(
                  (r) => r.role === selectedRole
                );
                if (stored) {
                  setLocalPermissions(new Set(stored.permissions));
                } else {
                  const tmpl = getDefaultTemplate(selectedRole);
                  setLocalPermissions(new Set(tmpl?.permissions ?? []));
                }
                setDirty(false);
              }}
            >
              Discard
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
