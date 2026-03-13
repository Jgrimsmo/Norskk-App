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
