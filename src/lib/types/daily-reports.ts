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
