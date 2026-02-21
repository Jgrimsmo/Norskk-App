// ── Permission Modules & Actions ─────────────────────────────
// Each permission is a string like "time-tracking.view", "dispatch.edit", etc.

export const PERMISSION_MODULES = [
  {
    id: "dashboard",
    label: "Dashboard",
    actions: [
      { id: "view", label: "View dashboard" },
    ],
  },
  {
    id: "time-tracking",
    label: "Time Tracking",
    actions: [
      { id: "view", label: "View time entries" },
      { id: "create", label: "Create time entries" },
      { id: "edit", label: "Edit time entries" },
      { id: "delete", label: "Delete time entries" },
      { id: "approve", label: "Approve / reject entries" },
      { id: "export", label: "Export data" },
    ],
  },
  {
    id: "dispatch",
    label: "Dispatch",
    actions: [
      { id: "view", label: "View dispatch board" },
      { id: "create", label: "Create assignments" },
      { id: "edit", label: "Edit assignments" },
      { id: "delete", label: "Delete assignments" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    actions: [
      { id: "view", label: "View projects" },
      { id: "create", label: "Create projects" },
      { id: "edit", label: "Edit projects" },
      { id: "delete", label: "Delete projects" },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    actions: [
      { id: "view", label: "View employees" },
      { id: "create", label: "Add employees" },
      { id: "edit", label: "Edit employees" },
      { id: "delete", label: "Remove employees" },
    ],
  },
  {
    id: "equipment",
    label: "Equipment",
    actions: [
      { id: "view", label: "View equipment" },
      { id: "create", label: "Add equipment" },
      { id: "edit", label: "Edit equipment" },
      { id: "delete", label: "Delete equipment" },
    ],
  },
  {
    id: "daily-reports",
    label: "Daily Reports",
    actions: [
      { id: "view", label: "View reports" },
      { id: "create", label: "Create reports" },
      { id: "edit", label: "Edit reports" },
      { id: "delete", label: "Delete reports" },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    actions: [
      { id: "view", label: "View safety forms" },
      { id: "create", label: "Create safety forms" },
      { id: "edit", label: "Edit safety forms" },
      { id: "delete", label: "Delete safety forms" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    actions: [
      { id: "view", label: "View settings" },
      { id: "edit", label: "Edit settings" },
      { id: "manage-roles", label: "Manage roles & permissions" },
    ],
  },
  {
    id: "field",
    label: "Field View",
    actions: [
      { id: "view", label: "Access field view" },
      { id: "view-others", label: "View other employees' data" },
    ],
  },
  {
    id: "vendors",
    label: "Vendors",
    actions: [
      { id: "view", label: "View vendors" },
      { id: "create", label: "Add vendors" },
      { id: "edit", label: "Edit vendors" },
      { id: "delete", label: "Delete vendors" },
    ],
  },
  {
    id: "payables",
    label: "Payables",
    actions: [
      { id: "view", label: "View invoices" },
      { id: "create", label: "Upload invoices" },
      { id: "approve", label: "Approve / reject invoices" },
      { id: "delete", label: "Delete invoices" },
    ],
  },
] as const;

// Build a flat list of all permission keys: "time-tracking.view", "dispatch.edit", etc.
export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((mod) =>
  mod.actions.map((a) => `${mod.id}.${a.id}`)
);

// ── Default Role Templates ──────────────────────────────────

/** Admin — full access to everything */
const ADMIN_PERMISSIONS: string[] = [...ALL_PERMISSIONS];

/** PM — can manage most things, no role/permissions management */
const PM_PERMISSIONS: string[] = ALL_PERMISSIONS.filter(
  (p) => p !== "settings.manage-roles"
);

/** Foreman — operational access, no settings or employee management */
const FOREMAN_PERMISSIONS: string[] = [
  "dashboard.view",
  "time-tracking.view",
  "time-tracking.create",
  "time-tracking.edit",
  "time-tracking.approve",
  "time-tracking.export",
  "dispatch.view",
  "projects.view",
  "employees.view",
  "equipment.view",
  "daily-reports.view",
  "daily-reports.create",
  "daily-reports.edit",
  "safety.view",
  "safety.create",
  "safety.edit",
  "field.view",
  "field.view-others",
  "vendors.view",
  "payables.view",
  "payables.create",
];

/** Operator — can log time, view dispatch and equipment, submit reports */
const OPERATOR_PERMISSIONS: string[] = [
  "dashboard.view",
  "time-tracking.view",
  "time-tracking.create",
  "time-tracking.edit",
  "dispatch.view",
  "projects.view",
  "employees.view",
  "equipment.view",
  "daily-reports.view",
  "daily-reports.create",
  "safety.view",
  "safety.create",
  "field.view",
  "vendors.view",
  "payables.view",
  "payables.create",
];

/** Labourer — basic field access, log own time */
const LABOURER_PERMISSIONS: string[] = [
  "dashboard.view",
  "time-tracking.view",
  "time-tracking.create",
  "dispatch.view",
  "projects.view",
  "equipment.view",
  "safety.view",
  "safety.create",
  "field.view",
  "vendors.view",
];

/** Safety Officer — full safety access + read-only on most modules */
const SAFETY_OFFICER_PERMISSIONS: string[] = [
  "dashboard.view",
  "time-tracking.view",
  "dispatch.view",
  "projects.view",
  "employees.view",
  "equipment.view",
  "daily-reports.view",
  "daily-reports.create",
  "daily-reports.edit",
  "safety.view",
  "safety.create",
  "safety.edit",
  "safety.delete",
  "field.view",
  "vendors.view",
  "payables.view",
];

export interface RoleTemplate {
  role: string;
  permissions: string[];
  description: string;
}

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    role: "Admin",
    permissions: ADMIN_PERMISSIONS,
    description: "Full access to all features and settings",
  },
  {
    role: "PM",
    permissions: PM_PERMISSIONS,
    description: "Project management with broad access, no role management",
  },
  {
    role: "Foreman",
    permissions: FOREMAN_PERMISSIONS,
    description: "Operational access — manage crew time, dispatch, and reports",
  },
  {
    role: "Operator",
    permissions: OPERATOR_PERMISSIONS,
    description: "Log time, view dispatch and equipment, submit reports",
  },
  {
    role: "Labourer",
    permissions: LABOURER_PERMISSIONS,
    description: "Basic access — log own time, view schedule",
  },
  {
    role: "Safety Officer",
    permissions: SAFETY_OFFICER_PERMISSIONS,
    description: "Full safety management, read-only on other modules",
  },
];

/** Get the default template for a role */
export function getDefaultTemplate(role: string): RoleTemplate | undefined {
  return DEFAULT_ROLE_TEMPLATES.find((t) => t.role === role);
}
