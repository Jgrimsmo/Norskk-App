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
}

export interface Project {
  id: string;
  name: string;
  number: string;
  developer: string;
  address: string;
  status: ProjectStatus;
  costCodeIds: string[];
}

export interface CostCode {
  id: string;
  code: string;
  description: string;
}

export type EquipmentStatus = "available" | "in-use" | "maintenance" | "retired";

export interface Equipment {
  id: string;
  name: string;
  number: string;
  category: string;
  status: EquipmentStatus;
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

// ── Dispatch ────────────────────────────────
export interface DispatchAssignment {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  projectId: string;
  employeeIds: string[];
  equipmentIds: string[];
  attachmentIds: string[];
  toolIds: string[];
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
  status: DailyReportStatus;
  // Core sections
  weather: WeatherEntry;
  workDescription: string;
  // Photos – three categories
  morningPhotoUrls: string[];
  workPhotoUrls: string[];
  endOfDayPhotoUrls: string[];
  // On-site staff (employee IDs)
  onSiteStaff: string[];
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

// ── Safety ──────────────────────────────────
export type SafetyFormType =
  | "flha"
  | "toolbox-talk"
  | "near-miss"
  | "incident-report"
  | "safety-inspection";

export type SafetyFormStatus = "draft" | "submitted" | "reviewed" | "closed";

export interface SafetyForm {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  formType: SafetyFormType;
  projectId: string;
  submittedById: string; // employee id
  title: string;
  description: string;
  status: SafetyFormStatus;
  // FLHA-specific data (populated when formType === "flha")
  flha?: FLHAData;
}

// ── FLHA (Field Level Hazard Assessment) ────
export type HazardRating = "low" | "medium" | "high" | "na";
export type CheckValue = "yes" | "no" | "na";

export interface HazardItem {
  id: string;
  category: string;
  hazard: string;
  identified: boolean; // is this hazard present?
  rating: HazardRating;
  controls: string; // control measures if identified
}

export interface PPEItem {
  id: string;
  name: string;
  required: CheckValue;
}

export interface CrewMember {
  employeeId: string;
  signatureDataUrl: string; // base64 data URL from signature pad
}

export interface FLHAData {
  // Section 1 — Job info
  taskDescription: string;
  location: string;
  // Section 2 — Hazard identification
  hazards: HazardItem[];
  // Section 3 — PPE requirements
  ppe: PPEItem[];
  // Section 4 — Additional controls / comments
  additionalControls: string;
  // Section 5 — Crew acknowledgment
  crewMembers: CrewMember[];
  // Section 6 — Supervisor sign-off
  supervisorId: string;
  supervisorSignature: string; // base64 data URL
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
