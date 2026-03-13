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
