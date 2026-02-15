import type {
  ProjectStatus,
  EmployeeStatus,
  EquipmentStatus,
  AttachmentStatus,
  ToolStatus,
  SafetyFormStatus,
  DailyReportStatus,
  ApprovalStatus,
} from "@/lib/types/time-tracking";

// ── Project Status ──
export const projectStatusColors: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  "on-hold": "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  bidding: "bg-purple-100 text-purple-800 border-purple-200",
};

// ── Employee Status ──
export const employeeStatusColors: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
};

// ── Equipment Status ──
export const equipmentStatusColors: Record<EquipmentStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  "in-use": "bg-blue-100 text-blue-800 border-blue-200",
  maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
  retired: "bg-gray-100 text-gray-800 border-gray-200",
};

// ── Attachment Status ──
export const attachmentStatusColors: Record<AttachmentStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  "in-use": "bg-blue-100 text-blue-800 border-blue-200",
  retired: "bg-gray-100 text-gray-800 border-gray-200",
};

// ── Tool Status ──
export const toolStatusColors: Record<ToolStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  "in-use": "bg-blue-100 text-blue-800 border-blue-200",
  lost: "bg-red-100 text-red-800 border-red-200",
  retired: "bg-gray-100 text-gray-800 border-gray-200",
};

// ── Safety Form Status ──
export const safetyStatusColors: Record<SafetyFormStatus, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  reviewed: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-blue-100 text-blue-800 border-blue-200",
};

// ── Daily Report Status ──
export const dailyReportStatusColors: Record<DailyReportStatus, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
};

// ── Approval Status ──
export const approvalStatusColors: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};
