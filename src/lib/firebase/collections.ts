/**
 * Firestore collection paths — single source of truth.
 */
export const Collections = {
  EMPLOYEES: "employees",
  PROJECTS: "projects",
  COST_CODES: "costCodes",
  DEVELOPERS: "developers",
  EQUIPMENT: "equipment",
  ATTACHMENTS: "attachments",
  TOOLS: "tools",
  TIME_ENTRIES: "timeEntries",
  SAFETY_FORMS: "safetyForms",
  DISPATCHES: "dispatches",
  DAILY_REPORTS: "dailyReports",
  COMPANY_PROFILE: "companyProfile",
  ROLE_PERMISSIONS: "rolePermissions",
  VENDORS: "vendors",
  INVOICES: "invoices",
  NOTIFICATIONS: "notifications",
  EQUIPMENT_CATEGORIES: "equipmentCategories",
  ATTACHMENT_CATEGORIES: "attachmentCategories",
  TOOL_CATEGORIES: "toolCategories",
} as const;

/** Sentinel equipment ID representing "no equipment". */
export const EQUIPMENT_NONE_ID = "eq-none";
