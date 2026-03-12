export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ProjectStatus = "active" | "on-hold" | "completed" | "bidding";

export type WorkType = "lump-sum" | "tm";

export interface TimeEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  employeeId: string;
  projectId: string;
  costCodeId: string;
  equipmentId: string;
  attachmentId: string;
  toolId: string;
  workType: WorkType;
  hours: number;
  notes: string;
  approval: ApprovalStatus;
}

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
  uid?: string;        // Firebase Auth UID — links auth account to employee
  createdAt?: string;  // ISO timestamp of account creation
  fcmToken?: string;   // Firebase Cloud Messaging token for push notifications
  /** Permission level — maps to a role template (Admin, PM, Foreman, etc.).
   *  Falls back to `role` when not set for backward compatibility. */
  permissionLevel?: string;

  // Employment details
  hireDate?: string;

  // Compensation
  currentWage?: number;
  wageType?: "hourly" | "salary";
  lastIncreaseDate?: string;
  lastIncreaseAmount?: number;
  wageHistory?: WageHistoryEntry[];

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Certificates
  certificates?: Certificate[];

  // Notes
  notes?: string;
}

export interface WageHistoryEntry {
  date: string;
  amount: number;
  note?: string;
}

export interface Certificate {
  id: string;
  name: string;
  issueDate?: string;
  expiryDate?: string;
  certificateNumber?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface Drawing {
  id: string;
  name: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface DrawingFolder {
  id: string;
  name: string;
  drawings: Drawing[];
}

export interface Project {
  id: string;
  name: string;
  number: string;
  developerId: string;
  address: string;     // street address
  city?: string;
  province?: string;
  status: ProjectStatus;
  costCodeIds: string[];
  payablesCostCodeIds?: string[]; // cost codes available in invoice uploads
  drawingFolders?: DrawingFolder[];
}

export interface CostCode {
  id: string;
  code: string;
  description: string;
}

export interface Developer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export type EquipmentStatus = "available" | "in-use" | "maintenance" | "rental" | "retired";

export interface ServiceHistoryEntry {
  id: string;
  date: string;
  hours: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  number: string;
  category: string;
  lastServiceHours: string;
  status: EquipmentStatus;

  // Detail fields
  year?: string;
  brand?: string;
  model?: string;
  weight?: string;
  lastServiceDate?: string;
  notes?: string;

  // Document uploads
  operatorsManualUrl?: string;
  operatorsManualName?: string;
  salesAgreementUrl?: string;
  salesAgreementName?: string;

  // Service history
  serviceHistory?: ServiceHistoryEntry[];
}

export type AttachmentStatus = "available" | "in-use" | "retired";

export interface Attachment {
  id: string;
  number: string;
  name: string;
  category: string;
  status: AttachmentStatus;
}

export type ToolStatus = "available" | "in-use" | "lost" | "retired";

export interface Tool {
  id: string;
  number: string;
  name: string;
  category: string;
  status: ToolStatus;
}

export interface EquipmentCategory {
  id: string;
  name: string;
}

// ── Dispatch ────────────────────────────────
export interface DispatchAssignment {
  id: string;
  date: string;     // start date ISO YYYY-MM-DD
  endDate?: string; // end date ISO YYYY-MM-DD (if multi-day; omit or same as date for single day)
  projectId: string;
  employeeIds: string[];
  equipmentIds: string[];
  attachmentIds: string[];
  toolIds: string[];
  // Per-resource date overrides — if absent the resource covers the full dispatch span.
  // Each resource can have multiple non-contiguous ranges (e.g. Mon–Tue + Thu).
  resourceDates?: Record<string, { start: string; end: string }[]>;
}

export type DispatchView = "day" | "week" | "month";

// ── Daily Reports ───────────────────────────
export type DailyReportStatus = "draft" | "submitted" | "approved";

export type WeatherCondition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "rain"
  | "snow"
  | "fog"
  | "windy"
  | "thunderstorm";

export type GroundCondition = "dry" | "wet" | "muddy" | "frozen" | "flooded";

export type DeliveryCondition = "good" | "damaged" | "partial" | "rejected";

export interface WeatherEntry {
  temperature: string; // e.g. "32°F / 45°F"
  conditions: WeatherCondition[];
  windSpeed: string;
  precipitation: string;
  groundConditions: GroundCondition;
  weatherDelay: boolean;
  delayHours: number;
  notes: string;
}

export interface ManpowerEntry {
  id: string;
  company: string; // "Norskk" or sub name
  trade: string;
  headcount: number;
  hoursWorked: number;
  overtimeHours: number;
  foremanName: string;
  workDescription: string;
}

export interface EquipmentLogEntry {
  id: string;
  equipmentId: string;
  hoursUsed: number;
  idleHours: number;
  operatorName: string;
  notes: string;
}

export interface WorkPerformedEntry {
  id: string;
  description: string;
  location: string;
  trade: string;
  status: "in-progress" | "completed" | "on-hold";
  percentComplete: number;
  photoUrls: string[];
  notes: string;
}

export interface DelayEntry {
  id: string;
  delayType: "weather" | "material" | "labor" | "equipment" | "owner" | "inspection" | "design" | "other";
  description: string;
  durationHours: number;
  responsibleParty: string;
  scheduleImpact: boolean;
}

export interface MaterialDelivery {
  id: string;
  description: string;
  supplier: string;
  quantity: string;
  poNumber: string;
  deliveryTicket: string;
  receivedBy: string;
  condition: DeliveryCondition;
  notes: string;
}

export interface VisitorEntry {
  id: string;
  name: string;
  company: string;
  purpose: string;
  timeIn: string;
  timeOut: string;
}

export interface DailyReport {
  id: string;
  reportNumber: number;
  date: string; // ISO YYYY-MM-DD
  time: string; // e.g. "11:37 AM"
  projectId: string;
  authorId: string; // employee id
  status?: DailyReportStatus;
  // Core sections
  weather: WeatherEntry;
  workDescription: string;
  // Photos – three categories
  morningPhotoUrls: string[];
  workPhotoUrls: string[];
  endOfDayPhotoUrls: string[];
  // On-site staff (employee IDs)
  onSiteStaff: string[];
  // On-site equipment (equipment IDs)
  onSiteEquipment?: string[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
  // ── Legacy / optional fields (kept for backward compat) ──
  manpower?: ManpowerEntry[];
  equipmentLog?: EquipmentLogEntry[];
  workPerformed?: WorkPerformedEntry[];
  delays?: DelayEntry[];
  materialDeliveries?: MaterialDelivery[];
  visitors?: VisitorEntry[];
  safetyNotes?: string;
  generalNotes?: string;
  nextDayPlan?: string;
  photoUrls?: string[];
  thirdPartyRentals?: string;
  tmWork?: boolean;
  tmWorkDescription?: string;
  tmDailyRentals?: string;
  authorSignature?: string;
  approverSignature?: string;
  approverId?: string;
}

// ── Vendors ─────────────────────────────────
export type VendorType = "vendor" | "subcontractor";

export interface Vendor {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  type?: VendorType;
}

// ── Payables (Invoices) ──────────────────────
export type InvoiceStatus = "needs-review" | "approved" | "rejected";
export type BillingType = "tm" | "lump-sum";

export interface Invoice {
  id: string;
  projectId: string;
  vendorId: string;
  amount: number;
  date: string;        // ISO YYYY-MM-DD
  costCodeId?: string;
  billingType?: BillingType;
  fileUrl: string;     // Firebase Storage download URL
  fileName: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

// ── Settings ────────────────────────────────
export type PayPeriodType = "weekly" | "bi-weekly" | "semi-monthly" | "monthly";

export interface CompanyProfile {
  id: string; // always "default"
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  /** Optional separate logo optimised for PDF/print (dark bg friendly) */
  pdfLogoUrl?: string;
  /** Pay period cadence — defaults to "bi-weekly" */
  payPeriodType: PayPeriodType;
  /** Anchor date for weekly / bi-weekly periods (ISO string, e.g. "2026-01-05") */
  payPeriodStartDate: string;
}

// ── Role Permissions ──

export interface RolePermissions {
  id: string; // matches the role name, e.g. "Admin", "Foreman"
  role: string;
  permissions: string[]; // e.g. ["time-tracking.view", "dispatch.edit"]
  description: string;
}

// ── Notifications ───────────────────────────
export type NotificationType = "dispatch-assigned" | "dispatch-changed" | "dispatch-removed";

export interface AppNotification {
  id: string;
  recipientId: string;    // employee ID
  type: NotificationType;
  title: string;
  body: string;
  dispatchId?: string;
  projectId?: string;
  date?: string;           // relevant date (ISO YYYY-MM-DD)
  read: boolean;
  createdAt: string;       // ISO datetime
}

// ── Custom Forms ────────────────────────────

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "toggle"
  | "photo"
  | "signature"
  | "section-header"
  | "label";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldConditional {
  fieldId: string;       // the field whose value determines visibility
  operator: "equals" | "not-equals" | "contains";
  value: string;
}

export type FormFieldOptionsSource =
  | "employees"
  | "projects"
  | "equipment"
  | "attachments"
  | "tools";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];    // for select, multiselect, radio, checkbox
  optionsSource?: FormFieldOptionsSource; // auto-populate options from data
  defaultValue?: string;
  conditional?: FormFieldConditional; // show only when condition is met
  width?: "full" | "half";       // layout hint
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
  repeatable?: boolean;          // allow user to add multiple instances
}

export type FormTemplateStatus = "active" | "archived";

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;              // e.g. "safety", "inspection", "quality"
  sections: FormSection[];
  status: FormTemplateStatus;
  requireProject?: boolean;      // must select a project when filling
  requireSignature?: boolean;    // require signature on submission
  createdBy: string;             // employee ID
  createdAt: string;
  updatedAt: string;
}

export type FormSubmissionStatus = "draft" | "submitted" | "reviewed";

export interface FormSubmission {
  id: string;
  templateId: string;
  templateName: string;          // denormalized for display
  projectId?: string;
  submittedById: string;         // employee ID
  submittedByName: string;       // denormalized
  status: FormSubmissionStatus;
  values: Record<string, unknown>;  // fieldId → value
  signatureUrl?: string;
  date: string;                  // ISO date
  createdAt: string;
  updatedAt: string;
  // Auto-linked entities (extracted from data-source fields on submit)
  category?: string;             // denormalized from template category
  linkedProjectIds?: string[];   // from project data-source fields
  linkedEquipmentIds?: string[]; // from equipment data-source fields
  linkedEmployeeIds?: string[];  // from employee data-source fields
  linkedAttachmentIds?: string[];// from attachment data-source fields
  linkedToolIds?: string[];      // from tool data-source fields
}
