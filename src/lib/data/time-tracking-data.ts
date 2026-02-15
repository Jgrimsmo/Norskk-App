import {
  TimeEntry,
  Employee,
  Project,
  CostCode,
  Equipment,
  Attachment,
  Tool,
  SafetyForm,
  DispatchAssignment,
  DailyReport,
} from "@/lib/types/time-tracking";
import { defaultHazards, defaultPPE } from "@/lib/data/flha-defaults";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

// --- Employees ---
export const employees: Employee[] = [
  { id: "emp-1", name: "John Martinez", role: "Carpenter", phone: "(612) 555-0101", email: "jmartinez@norskk.com", status: "active" },
  { id: "emp-2", name: "Sarah Johnson", role: "Iron Worker", phone: "(612) 555-0102", email: "sjohnson@norskk.com", status: "active" },
  { id: "emp-3", name: "Mike O'Brien", role: "Carpenter", phone: "(612) 555-0103", email: "mobrien@norskk.com", status: "active" },
  { id: "emp-4", name: "David Chen", role: "Equipment Operator", phone: "(612) 555-0104", email: "dchen@norskk.com", status: "active" },
  { id: "emp-5", name: "Lisa Thompson", role: "Electrician", phone: "(612) 555-0105", email: "lthompson@norskk.com", status: "active" },
  { id: "emp-6", name: "Carlos Rivera", role: "Finisher", phone: "(612) 555-0106", email: "crivera@norskk.com", status: "active" },
  { id: "emp-7", name: "Amy Wilson", role: "Electrician", phone: "(612) 555-0107", email: "awilson@norskk.com", status: "inactive" },
  { id: "emp-8", name: "James Patterson", role: "Plumber", phone: "(612) 555-0108", email: "jpatterson@norskk.com", status: "active" },
];

// --- Projects ---
export const projects: Project[] = [
  {
    id: "proj-1",
    name: "Downtown Office Tower",
    number: "2026-001",
    developer: "Apex Development Group",
    address: "350 Main St, Minneapolis, MN 55401",
    status: "active",
    costCodeIds: ["cc-1", "cc-3", "cc-5", "cc-8", "cc-9"],
  },
  {
    id: "proj-2",
    name: "Riverside Apartments",
    number: "2026-002",
    developer: "Summit Living LLC",
    address: "1200 River Rd, St. Paul, MN 55116",
    status: "active",
    costCodeIds: ["cc-1", "cc-2", "cc-6", "cc-7", "cc-9"],
  },
  {
    id: "proj-3",
    name: "North Industrial Park",
    number: "2026-003",
    developer: "Northern Logistics Inc.",
    address: "8800 Industrial Blvd, Brooklyn Park, MN 55445",
    status: "bidding",
    costCodeIds: ["cc-1", "cc-2", "cc-3"],
  },
  {
    id: "proj-4",
    name: "Highway 55 Bridge Repair",
    number: "2026-004",
    developer: "MnDOT",
    address: "Hwy 55 & County Rd 18, Plymouth, MN 55441",
    status: "on-hold",
    costCodeIds: ["cc-1", "cc-3", "cc-5"],
  },
  {
    id: "proj-5",
    name: "City Hall Renovation",
    number: "2025-018",
    developer: "City of Edina",
    address: "4801 W 50th St, Edina, MN 55424",
    status: "completed",
    costCodeIds: ["cc-1", "cc-4", "cc-6", "cc-7", "cc-8", "cc-9"],
  },
];

// --- Cost Codes ---
export const costCodes: CostCode[] = [
  { id: "cc-1", code: "01-100", description: "General Conditions" },
  { id: "cc-2", code: "02-200", description: "Site Work" },
  { id: "cc-3", code: "03-300", description: "Concrete" },
  { id: "cc-4", code: "04-400", description: "Masonry" },
  { id: "cc-5", code: "05-500", description: "Metals / Structural Steel" },
  { id: "cc-6", code: "06-600", description: "Carpentry" },
  { id: "cc-7", code: "09-900", description: "Finishes" },
  { id: "cc-8", code: "15-100", description: "Mechanical / Plumbing" },
  { id: "cc-9", code: "16-100", description: "Electrical" },
];

// --- Equipment ---
export const equipment: Equipment[] = [
  { id: "eq-1", name: "CAT 320 Excavator", number: "EQ-001", category: "Excavator", status: "in-use" },
  { id: "eq-2", name: "Boom Lift 60ft", number: "EQ-002", category: "Lift", status: "available" },
  { id: "eq-3", name: "Concrete Pump Truck", number: "EQ-003", category: "Truck", status: "in-use" },
  { id: "eq-4", name: "Skid Steer Loader", number: "EQ-004", category: "Loader", status: "available" },
  { id: "eq-5", name: "Dump Truck 10-yd", number: "EQ-005", category: "Truck", status: "maintenance" },
  { id: "eq-6", name: "Crane 50-ton", number: "EQ-006", category: "Crane", status: "in-use" },
  { id: "eq-7", name: "Forklift 5K", number: "EQ-007", category: "Forklift", status: "available" },
  { id: EQUIPMENT_NONE_ID, name: "None", number: "—", category: "—", status: "available" },
];

// --- Sample Time Entries (current week) ---
function getMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const monday = getMonday();

export const sampleTimeEntries: TimeEntry[] = [
  {
    id: "te-1",
    date: formatDate(monday),
    employeeId: "emp-1",
    projectId: "proj-1",
    costCodeId: "cc-3",
    equipmentId: "eq-3",
    attachmentId: "",
    toolId: "tl-4",
    workType: "lump-sum",
    hours: 8,
    notes: "Poured foundation section B",
    approval: "approved",
  },
  {
    id: "te-2",
    date: formatDate(monday),
    employeeId: "emp-2",
    projectId: "proj-1",
    costCodeId: "cc-5",
    equipmentId: "eq-6",
    attachmentId: "",
    toolId: "",
    workType: "lump-sum",
    hours: 8,
    notes: "Steel erection 3rd floor",
    approval: "approved",
  },
  {
    id: "te-3",
    date: formatDate(addDays(monday, 1)),
    employeeId: "emp-1",
    projectId: "proj-1",
    costCodeId: "cc-3",
    equipmentId: "eq-3",
    attachmentId: "",
    toolId: "tl-4",
    workType: "tm",
    hours: 10,
    notes: "Overtime — finishing pour before rain",
    approval: "pending",
  },
  {
    id: "te-4",
    date: formatDate(addDays(monday, 1)),
    employeeId: "emp-3",
    projectId: "proj-2",
    costCodeId: "cc-6",
    equipmentId: EQUIPMENT_NONE_ID,
    attachmentId: "",
    toolId: "tl-3",
    workType: "tm",
    hours: 8,
    notes: "Framing units 4A-4D",
    approval: "pending",
  },
  {
    id: "te-5",
    date: formatDate(addDays(monday, 2)),
    employeeId: "emp-4",
    projectId: "proj-3",
    costCodeId: "cc-2",
    equipmentId: "eq-1",
    attachmentId: "att-1",
    toolId: "",
    workType: "lump-sum",
    hours: 8,
    notes: "Excavation for utility trench",
    approval: "pending",
  },
  {
    id: "te-6",
    date: formatDate(addDays(monday, 2)),
    employeeId: "emp-5",
    projectId: "proj-4",
    costCodeId: "cc-3",
    equipmentId: EQUIPMENT_NONE_ID,
    attachmentId: "",
    toolId: "tl-1",
    workType: "tm",
    hours: 6,
    notes: "Bridge deck prep",
    approval: "rejected",
  },
  {
    id: "te-7",
    date: formatDate(addDays(monday, 3)),
    employeeId: "emp-6",
    projectId: "proj-5",
    costCodeId: "cc-7",
    equipmentId: EQUIPMENT_NONE_ID,
    attachmentId: "",
    toolId: "",
    workType: "lump-sum",
    hours: 8,
    notes: "Drywall install 2nd floor",
    approval: "pending",
  },
  {
    id: "te-8",
    date: formatDate(addDays(monday, 3)),
    employeeId: "emp-7",
    projectId: "proj-2",
    costCodeId: "cc-9",
    equipmentId: "eq-2",
    attachmentId: "",
    toolId: "tl-2",
    workType: "tm",
    hours: 8,
    notes: "Electrical rough-in units 3A-3C",
    approval: "pending",
  },
  {
    id: "te-9",
    date: formatDate(addDays(monday, 4)),
    employeeId: "emp-8",
    projectId: "proj-1",
    costCodeId: "cc-8",
    equipmentId: EQUIPMENT_NONE_ID,
    attachmentId: "",
    toolId: "tl-7",
    workType: "lump-sum",
    hours: 8,
    notes: "Plumbing risers floors 2-4",
    approval: "pending",
  },
  {
    id: "te-10",
    date: formatDate(addDays(monday, 4)),
    employeeId: "emp-1",
    projectId: "proj-3",
    costCodeId: "cc-2",
    equipmentId: "eq-4",
    attachmentId: "",
    toolId: "",
    workType: "tm",
    hours: 8,
    notes: "Grading and compaction",
    approval: "pending",
  },
];

// --- Attachments ---
export const attachments: Attachment[] = [
  { id: "att-1", number: "AT-001", name: "36\" Excavator Bucket", category: "Bucket", status: "in-use" },
  { id: "att-2", number: "AT-002", name: "24\" Excavator Bucket", category: "Bucket", status: "available" },
  { id: "att-3", number: "AT-003", name: "Hydraulic Breaker", category: "Breaker", status: "available" },
  { id: "att-4", number: "AT-004", name: "Auger 12\"", category: "Auger", status: "in-use" },
  { id: "att-5", number: "AT-005", name: "Pallet Forks", category: "Fork", status: "available" },
  { id: "att-6", number: "AT-006", name: "Grading Blade 6ft", category: "Blade", status: "retired" },
  { id: "att-7", number: "AT-007", name: "Compaction Wheel", category: "Compactor", status: "available" },
];

// --- Tools ---
export const tools: Tool[] = [
  { id: "tl-1", number: "TL-001", name: "Dewalt Rotary Hammer", category: "Power Tool", status: "in-use" },
  { id: "tl-2", number: "TL-002", name: "Hilti TE 70 Hammer Drill", category: "Power Tool", status: "available" },
  { id: "tl-3", number: "TL-003", name: "Milwaukee Sawzall", category: "Power Tool", status: "in-use" },
  { id: "tl-4", number: "TL-004", name: "Concrete Vibrator", category: "Power Tool", status: "available" },
  { id: "tl-5", number: "TL-005", name: "Laser Level (Topcon)", category: "Measuring", status: "in-use" },
  { id: "tl-6", number: "TL-006", name: "Transit Level", category: "Measuring", status: "available" },
  { id: "tl-7", number: "TL-007", name: "Pipe Wrench Set", category: "Hand Tool", status: "available" },
  { id: "tl-8", number: "TL-008", name: "Rebar Bender", category: "Hand Tool", status: "lost" },
  { id: "tl-9", number: "TL-009", name: "Chop Saw 14\"", category: "Power Tool", status: "retired" },
];

// --- Safety Forms ---
export const safetyForms: SafetyForm[] = [
  {
    id: "sf-1",
    date: formatDate(monday),
    formType: "flha",
    projectId: "proj-1",
    submittedById: "emp-1",
    title: "Morning FLHA — Foundation Pour",
    description: "Identified trip hazards near rebar mats. Flagged and barricaded before work began.",
    status: "reviewed",
    flha: {
      taskDescription: "Pouring concrete for foundation section B. Includes rebar placement, form inspection, and concrete vibrating.",
      location: "Building A — Ground Level, Section B",
      hazards: defaultHazards().map((h) => {
        if (h.id === "h-3") return { ...h, identified: true, rating: "medium" as const, controls: "Hard hats mandatory, overhead netting installed" };
        if (h.id === "h-17") return { ...h, identified: true, rating: "medium" as const, controls: "Rotate workers every 2 hours, mechanical aids for heavy pours" };
        if (h.id === "h-18") return { ...h, identified: true, rating: "high" as const, controls: "Trip hazards flagged and barricaded, housekeeping between pours" };
        if (h.id === "h-14") return { ...h, identified: true, rating: "low" as const, controls: "Hearing protection near vibrator" };
        return h;
      }),
      ppe: defaultPPE().map((p) => {
        if (p.id === "ppe-1") return { ...p, required: "yes" as const };
        if (p.id === "ppe-2") return { ...p, required: "yes" as const };
        if (p.id === "ppe-3") return { ...p, required: "yes" as const };
        if (p.id === "ppe-4") return { ...p, required: "yes" as const };
        if (p.id === "ppe-5") return { ...p, required: "yes" as const };
        if (p.id === "ppe-6") return { ...p, required: "yes" as const };
        return { ...p, required: "no" as const };
      }),
      additionalControls: "Concrete truck access path clearly marked. Spotter assigned for all truck movements. Water available for dust control.",
      crewMembers: [
        { employeeId: "emp-1", signatureDataUrl: "" },
        { employeeId: "emp-4", signatureDataUrl: "" },
      ],
      supervisorId: "emp-2",
      supervisorSignature: "",
    },
  },
  {
    id: "sf-2",
    date: formatDate(monday),
    formType: "toolbox-talk",
    projectId: "proj-1",
    submittedById: "emp-2",
    title: "Fall Protection Refresher",
    description: "Reviewed harness inspection, anchor points, and rescue procedures for steel erection crew.",
    status: "submitted",
  },
  {
    id: "sf-3",
    date: formatDate(addDays(monday, 1)),
    formType: "near-miss",
    projectId: "proj-2",
    submittedById: "emp-3",
    title: "Falling Material — 2nd Floor",
    description: "Loose board fell from 2nd floor decking. No injuries. Area secured and netting installed.",
    status: "reviewed",
  },
  {
    id: "sf-4",
    date: formatDate(addDays(monday, 1)),
    formType: "flha",
    projectId: "proj-3",
    submittedById: "emp-4",
    title: "Excavation FLHA",
    description: "Checked slope stability, located underground utilities, confirmed shoring in place.",
    status: "submitted",
    flha: {
      taskDescription: "Excavation for utility trench — water and sewer lines, 6ft depth. Shoring and benching required.",
      location: "Site C — North Lot, Utility Corridor",
      hazards: defaultHazards().map((h) => {
        if (h.id === "h-4") return { ...h, identified: true, rating: "high" as const, controls: "Shoring installed, benching per soil classification" };
        if (h.id === "h-5") return { ...h, identified: true, rating: "high" as const, controls: "Utility locates completed and marked, hand dig within 1m" };
        if (h.id === "h-9") return { ...h, identified: true, rating: "medium" as const, controls: "Spotter for excavator, exclusion zone established" };
        if (h.id === "h-10") return { ...h, identified: true, rating: "medium" as const, controls: "Swing radius flagged, workers clear during bucket operation" };
        if (h.id === "h-18") return { ...h, identified: true, rating: "medium" as const, controls: "Access/egress ladder every 25ft, spoil pile setback 2ft" };
        return h;
      }),
      ppe: defaultPPE().map((p) => {
        if (p.id === "ppe-1") return { ...p, required: "yes" as const };
        if (p.id === "ppe-2") return { ...p, required: "yes" as const };
        if (p.id === "ppe-3") return { ...p, required: "yes" as const };
        if (p.id === "ppe-4") return { ...p, required: "yes" as const };
        if (p.id === "ppe-6") return { ...p, required: "yes" as const };
        return { ...p, required: "no" as const };
      }),
      additionalControls: "Atmospheric testing before entry. Competent person on site at all times. Emergency rescue plan reviewed with crew.",
      crewMembers: [
        { employeeId: "emp-4", signatureDataUrl: "" },
        { employeeId: "emp-1", signatureDataUrl: "" },
      ],
      supervisorId: "emp-3",
      supervisorSignature: "",
    },
  },
  {
    id: "sf-5",
    date: formatDate(addDays(monday, 2)),
    formType: "safety-inspection",
    projectId: "proj-1",
    submittedById: "emp-5",
    title: "Weekly Site Inspection",
    description: "Inspected scaffolding, fire extinguishers, first aid kits, and housekeeping across all floors.",
    status: "closed",
  },
  {
    id: "sf-6",
    date: formatDate(addDays(monday, 2)),
    formType: "incident-report",
    projectId: "proj-4",
    submittedById: "emp-6",
    title: "Minor Hand Laceration",
    description: "Worker cut left hand on exposed rebar. First aid administered on site. No lost time.",
    status: "reviewed",
  },
  {
    id: "sf-7",
    date: formatDate(addDays(monday, 3)),
    formType: "toolbox-talk",
    projectId: "proj-2",
    submittedById: "emp-7",
    title: "Electrical Safety Awareness",
    description: "Covered lockout/tagout procedures, identifying live circuits, and PPE requirements for electrical work.",
    status: "submitted",
  },
  {
    id: "sf-8",
    date: formatDate(addDays(monday, 3)),
    formType: "flha",
    projectId: "proj-5",
    submittedById: "emp-6",
    title: "Drywall Installation FLHA",
    description: "Assessed dust exposure, manual lifting risks, and scaffolding stability for interior finishing.",
    status: "draft",
  },
  {
    id: "sf-9",
    date: formatDate(addDays(monday, 4)),
    formType: "near-miss",
    projectId: "proj-1",
    submittedById: "emp-8",
    title: "Unsecured Load on Crane",
    description: "Load sling showed signs of wear during pre-lift check. Replaced before lift. No incident.",
    status: "submitted",
  },
  {
    id: "sf-10",
    date: formatDate(addDays(monday, 4)),
    formType: "safety-inspection",
    projectId: "proj-3",
    submittedById: "emp-4",
    title: "Trench Safety Inspection",
    description: "Confirmed proper benching, ladder access, and atmospheric testing in all open trenches.",
    status: "draft",
  },
];

// --- Dispatch Assignments ---
export const sampleDispatches: DispatchAssignment[] = [
  {
    id: "dsp-1",
    date: formatDate(monday),
    projectId: "proj-1",
    employeeIds: ["emp-1", "emp-2"],
    equipmentIds: ["eq-3", "eq-6"],
    attachmentIds: [],
    toolIds: ["tl-4"],
  },
  {
    id: "dsp-2",
    date: formatDate(monday),
    projectId: "proj-2",
    employeeIds: ["emp-3"],
    equipmentIds: [],
    attachmentIds: [],
    toolIds: ["tl-3"],
  },
  {
    id: "dsp-3",
    date: formatDate(addDays(monday, 1)),
    projectId: "proj-1",
    employeeIds: ["emp-1"],
    equipmentIds: ["eq-3"],
    attachmentIds: [],
    toolIds: ["tl-4"],
  },
  {
    id: "dsp-4",
    date: formatDate(addDays(monday, 1)),
    projectId: "proj-2",
    employeeIds: ["emp-3", "emp-6"],
    equipmentIds: ["eq-2"],
    attachmentIds: [],
    toolIds: ["tl-3"],
  },
  {
    id: "dsp-5",
    date: formatDate(addDays(monday, 2)),
    projectId: "proj-3",
    employeeIds: ["emp-4"],
    equipmentIds: ["eq-1"],
    attachmentIds: ["att-1"],
    toolIds: [],
  },
  {
    id: "dsp-6",
    date: formatDate(addDays(monday, 2)),
    projectId: "proj-1",
    employeeIds: ["emp-2", "emp-5"],
    equipmentIds: ["eq-6"],
    attachmentIds: [],
    toolIds: ["tl-1", "tl-5"],
  },
  {
    id: "dsp-7",
    date: formatDate(addDays(monday, 3)),
    projectId: "proj-2",
    employeeIds: ["emp-3", "emp-6", "emp-8"],
    equipmentIds: [],
    attachmentIds: [],
    toolIds: ["tl-7"],
  },
  {
    id: "dsp-8",
    date: formatDate(addDays(monday, 4)),
    projectId: "proj-1",
    employeeIds: ["emp-1", "emp-8"],
    equipmentIds: ["eq-3"],
    attachmentIds: [],
    toolIds: ["tl-4", "tl-7"],
  },
];

// --- Daily Reports ---
export const sampleDailyReports: DailyReport[] = [
  {
    id: "dr-1",
    reportNumber: 1,
    date: formatDate(monday),
    projectId: "proj-1",
    authorId: "emp-1",
    status: "approved",
    weather: {
      temperature: "28°F / 38°F",
      conditions: ["partly-cloudy", "windy"],
      windSpeed: "15 mph NW",
      precipitation: "None",
      groundConditions: "frozen",
      weatherDelay: false,
      delayHours: 0,
      notes: "Cold morning, warmed up by afternoon. Wind chill advisory until 10am.",
    },
    manpower: [
      {
        id: "mp-1",
        company: "Norskk",
        trade: "Carpenter",
        headcount: 4,
        hoursWorked: 8,
        overtimeHours: 0,
        foremanName: "John Martinez",
        workDescription: "Foundation formwork and rebar placement for Section B",
      },
      {
        id: "mp-2",
        company: "Norskk",
        trade: "Iron Worker",
        headcount: 3,
        hoursWorked: 8,
        overtimeHours: 0,
        foremanName: "Sarah Johnson",
        workDescription: "Steel erection 3rd floor columns and beams",
      },
      {
        id: "mp-3",
        company: "Atlas Electrical",
        trade: "Electrician",
        headcount: 2,
        hoursWorked: 8,
        overtimeHours: 2,
        foremanName: "Tom Reynolds",
        workDescription: "Conduit rough-in 2nd floor east wing",
      },
    ],
    equipmentLog: [
      {
        id: "el-1",
        equipmentId: "eq-3",
        hoursUsed: 6,
        idleHours: 2,
        operatorName: "David Chen",
        notes: "Pump truck positioned at Section B. Idle during rebar inspection.",
      },
      {
        id: "el-2",
        equipmentId: "eq-6",
        hoursUsed: 8,
        idleHours: 0,
        operatorName: "Mike Stevens",
        notes: "Crane supporting steel erection all day. No issues.",
      },
    ],
    workPerformed: [
      {
        id: "wp-1",
        description: "Completed foundation formwork for Section B grid lines 4-7. Rebar mats placed and inspected. Ready for concrete pour tomorrow.",
        location: "Building A — Ground Level, Section B",
        trade: "Concrete / Carpentry",
        status: "completed",
        percentComplete: 100,
        photoUrls: [],
        notes: "Inspector signed off on rebar placement at 3:15 PM.",
      },
      {
        id: "wp-2",
        description: "Erected 12 columns and 8 beams on 3rd floor. Bolted connections torqued and documented.",
        location: "Building A — 3rd Floor",
        trade: "Structural Steel",
        status: "in-progress",
        percentComplete: 65,
        photoUrls: [],
        notes: "Remaining 4 columns scheduled for tomorrow.",
      },
    ],
    delays: [],
    materialDeliveries: [
      {
        id: "md-1",
        description: "#4 and #5 Rebar bundles (Grade 60)",
        supplier: "Nucor Steel",
        quantity: "12 tons",
        poNumber: "PO-2026-0045",
        deliveryTicket: "DT-88412",
        receivedBy: "John Martinez",
        condition: "good",
        notes: "Stored at north laydown area. Mill certs received.",
      },
    ],
    visitors: [
      {
        id: "v-1",
        name: "Robert Kim",
        company: "Apex Development Group",
        purpose: "Owner progress walkthrough",
        timeIn: "10:00 AM",
        timeOut: "11:30 AM",
      },
      {
        id: "v-2",
        name: "Carol Jensen",
        company: "City of Minneapolis",
        purpose: "Rebar inspection — Section B foundations",
        timeIn: "2:30 PM",
        timeOut: "3:30 PM",
      },
    ],
    safetyNotes: "Morning toolbox talk: cold weather safety and slip/trip prevention. All workers observed wearing proper PPE including cold weather gear. No incidents.",
    generalNotes: "Good progress day. Section B foundations ahead of schedule. Owner pleased with progress during walkthrough.",
    nextDayPlan: "Concrete pour Section B foundations (120 CY). Continue steel erection 3rd floor. Begin conduit rough-in 2nd floor west wing.",
    photoUrls: [],
    authorSignature: "",
    approverSignature: "",
    approverId: "emp-4",
    createdAt: formatDate(monday) + "T17:00:00",
    updatedAt: formatDate(monday) + "T18:30:00",
  },
  {
    id: "dr-2",
    reportNumber: 2,
    date: formatDate(addDays(monday, 1)),
    projectId: "proj-1",
    authorId: "emp-1",
    status: "submitted",
    weather: {
      temperature: "30°F / 42°F",
      conditions: ["cloudy", "rain"],
      windSpeed: "8 mph SE",
      precipitation: "Light rain after 2pm, 0.15 in",
      groundConditions: "wet",
      weatherDelay: true,
      delayHours: 1.5,
      notes: "Rain delayed concrete finishing operations. Tarps deployed over fresh pour.",
    },
    manpower: [
      {
        id: "mp-4",
        company: "Norskk",
        trade: "Carpenter",
        headcount: 4,
        hoursWorked: 10,
        overtimeHours: 2,
        foremanName: "John Martinez",
        workDescription: "Concrete pour and finishing Section B foundations",
      },
      {
        id: "mp-5",
        company: "Norskk",
        trade: "Finisher",
        headcount: 2,
        hoursWorked: 10,
        overtimeHours: 2,
        foremanName: "Carlos Rivera",
        workDescription: "Concrete finishing and curing compound application",
      },
    ],
    equipmentLog: [
      {
        id: "el-3",
        equipmentId: "eq-3",
        hoursUsed: 8,
        idleHours: 0,
        operatorName: "David Chen",
        notes: "Pump truck running full day for foundation pour.",
      },
    ],
    workPerformed: [
      {
        id: "wp-3",
        description: "Poured 120 CY concrete for Section B foundations. Achieved target slump of 4 inches. Cylinders taken for 7/28-day breaks. Rain at 2pm required tarps and delayed finishing by 1.5 hours.",
        location: "Building A — Ground Level, Section B",
        trade: "Concrete",
        status: "completed",
        percentComplete: 100,
        photoUrls: [],
        notes: "Overtime required to complete finishing before dark. Curing compound applied.",
      },
    ],
    delays: [
      {
        id: "d-1",
        delayType: "weather",
        description: "Light rain starting at 2:00 PM delayed concrete finishing operations. Crew deployed tarps and waited for break in rain.",
        durationHours: 1.5,
        responsibleParty: "N/A — Weather",
        scheduleImpact: false,
      },
    ],
    materialDeliveries: [
      {
        id: "md-2",
        description: "Ready-mix concrete (4000 PSI)",
        supplier: "Aggregate Industries",
        quantity: "120 CY (16 trucks)",
        poNumber: "PO-2026-0048",
        deliveryTicket: "Batch tickets 4401-4416",
        receivedBy: "John Martinez",
        condition: "good",
        notes: "All slump tests within spec. Batch tickets filed.",
      },
    ],
    visitors: [],
    safetyNotes: "Toolbox talk: wet weather concrete operations. Non-slip mats placed around pour area. Rain gear required for all workers. No incidents.",
    generalNotes: "Pour completed despite weather. Quality looks good. Overtime was necessary but Section B foundations are now complete.",
    nextDayPlan: "Strip forms Section B. Begin excavation for Section C footings. Continue steel erection 3rd floor.",
    photoUrls: [],
    authorSignature: "",
    approverSignature: "",
    approverId: "",
    createdAt: formatDate(addDays(monday, 1)) + "T19:00:00",
    updatedAt: formatDate(addDays(monday, 1)) + "T19:00:00",
  },
  {
    id: "dr-3",
    reportNumber: 1,
    date: formatDate(monday),
    projectId: "proj-2",
    authorId: "emp-3",
    status: "draft",
    weather: {
      temperature: "28°F / 38°F",
      conditions: ["partly-cloudy"],
      windSpeed: "10 mph W",
      precipitation: "None",
      groundConditions: "dry",
      weatherDelay: false,
      delayHours: 0,
      notes: "",
    },
    manpower: [
      {
        id: "mp-6",
        company: "Norskk",
        trade: "Carpenter",
        headcount: 3,
        hoursWorked: 8,
        overtimeHours: 0,
        foremanName: "Mike O'Brien",
        workDescription: "Framing units 4A through 4D",
      },
    ],
    equipmentLog: [],
    workPerformed: [
      {
        id: "wp-4",
        description: "Framed interior walls for units 4A, 4B, 4C, and 4D. Exterior sheathing started on unit 4A.",
        location: "Building 2 — 4th Floor",
        trade: "Carpentry",
        status: "in-progress",
        percentComplete: 40,
        photoUrls: [],
        notes: "Material shortage on 2x6 studs — delivery expected Wednesday.",
      },
    ],
    delays: [
      {
        id: "d-2",
        delayType: "material",
        description: "Short on 2x6 studs for exterior walls. Partial delivery only. Full shipment expected Wednesday.",
        durationHours: 0,
        responsibleParty: "ABC Lumber Supply",
        scheduleImpact: false,
      },
    ],
    materialDeliveries: [],
    visitors: [],
    safetyNotes: "Standard PPE enforced. Fall protection in place for 4th floor work.",
    generalNotes: "Good progress on framing despite material shortage. Adjusted work plan to focus on interior walls until studs arrive.",
    nextDayPlan: "Continue interior framing units 4A-4D. Begin plumbing rough-in unit 3A if plumber available.",
    photoUrls: [],
    authorSignature: "",
    approverSignature: "",
    approverId: "",
    createdAt: formatDate(monday) + "T16:30:00",
    updatedAt: formatDate(monday) + "T16:30:00",
  },
];
