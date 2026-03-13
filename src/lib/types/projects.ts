export type ProjectStatus = "active" | "on-hold" | "completed" | "bidding";

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
