import { type HazardItem, type PPEItem } from "@/lib/types/time-tracking";

// ── Default hazard checklist for a new FLHA ──
export function defaultHazards(): HazardItem[] {
  return [
    // Working at Heights
    { id: "h-1", category: "Working at Heights", hazard: "Ladders / scaffolding", identified: false, rating: "na", controls: "" },
    { id: "h-2", category: "Working at Heights", hazard: "Open floor / roof edges", identified: false, rating: "na", controls: "" },
    { id: "h-3", category: "Working at Heights", hazard: "Overhead work / falling objects", identified: false, rating: "na", controls: "" },
    // Ground Disturbance
    { id: "h-4", category: "Ground Disturbance", hazard: "Excavation / trenching", identified: false, rating: "na", controls: "" },
    { id: "h-5", category: "Ground Disturbance", hazard: "Underground utilities", identified: false, rating: "na", controls: "" },
    // Electrical
    { id: "h-6", category: "Electrical", hazard: "Overhead power lines", identified: false, rating: "na", controls: "" },
    { id: "h-7", category: "Electrical", hazard: "Exposed wiring / live circuits", identified: false, rating: "na", controls: "" },
    // Mobile Equipment
    { id: "h-8", category: "Mobile Equipment", hazard: "Cranes / hoisting", identified: false, rating: "na", controls: "" },
    { id: "h-9", category: "Mobile Equipment", hazard: "Heavy equipment movement", identified: false, rating: "na", controls: "" },
    { id: "h-10", category: "Mobile Equipment", hazard: "Struck-by / pinch points", identified: false, rating: "na", controls: "" },
    // Confined Space
    { id: "h-11", category: "Confined Space", hazard: "Confined / restricted space entry", identified: false, rating: "na", controls: "" },
    // Chemical / Environmental
    { id: "h-12", category: "Chemical / Environmental", hazard: "Chemical exposure / fumes", identified: false, rating: "na", controls: "" },
    { id: "h-13", category: "Chemical / Environmental", hazard: "Dust / silica / asbestos", identified: false, rating: "na", controls: "" },
    { id: "h-14", category: "Chemical / Environmental", hazard: "Noise exposure", identified: false, rating: "na", controls: "" },
    // Hot Work
    { id: "h-15", category: "Hot Work", hazard: "Welding / cutting / grinding", identified: false, rating: "na", controls: "" },
    { id: "h-16", category: "Hot Work", hazard: "Fire / explosion risk", identified: false, rating: "na", controls: "" },
    // Ergonomic / General
    { id: "h-17", category: "Ergonomic / General", hazard: "Manual lifting / repetitive strain", identified: false, rating: "na", controls: "" },
    { id: "h-18", category: "Ergonomic / General", hazard: "Slips, trips, and falls", identified: false, rating: "na", controls: "" },
    { id: "h-19", category: "Ergonomic / General", hazard: "Poor housekeeping", identified: false, rating: "na", controls: "" },
    { id: "h-20", category: "Ergonomic / General", hazard: "Weather conditions (heat, cold, wind)", identified: false, rating: "na", controls: "" },
  ];
}

// ── Default PPE checklist for a new FLHA ──
export function defaultPPE(): PPEItem[] {
  return [
    { id: "ppe-1", name: "Hard Hat", required: "na" },
    { id: "ppe-2", name: "Safety Glasses", required: "na" },
    { id: "ppe-3", name: "Hi-Vis Vest", required: "na" },
    { id: "ppe-4", name: "Steel-Toe Boots", required: "na" },
    { id: "ppe-5", name: "Hearing Protection", required: "na" },
    { id: "ppe-6", name: "Gloves", required: "na" },
    { id: "ppe-7", name: "Fall Protection / Harness", required: "na" },
    { id: "ppe-8", name: "Respirator / Dust Mask", required: "na" },
    { id: "ppe-9", name: "Face Shield", required: "na" },
    { id: "ppe-10", name: "Welding Helmet", required: "na" },
    { id: "ppe-11", name: "Fire-Resistant Clothing", required: "na" },
  ];
}
