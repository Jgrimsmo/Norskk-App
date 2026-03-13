import type {
  FormFieldType,
  FormField,
  FormSection,
  FormFieldOptionsSource,
} from "@/lib/types/forms";

export const OPTIONS_SOURCES: { value: FormFieldOptionsSource; label: string }[] = [
  { value: "employees", label: "Employees" },
  { value: "projects", label: "Projects" },
  { value: "equipment", label: "Equipment" },
  { value: "attachments", label: "Attachments" },
  { value: "tools", label: "Tools" },
];

/** Short random id using built-in crypto */
export const uid = (len = 8) => crypto.randomUUID().replace(/-/g, "").slice(0, len);

/** Strip undefined values so Firestore doesn't reject them */
export function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ── Field type definitions ──
export const FIELD_TYPES: { type: FormFieldType; label: string; description: string }[] = [
  { type: "text", label: "Short Text", description: "Single line text input" },
  { type: "textarea", label: "Long Text", description: "Multi-line text area" },
  { type: "number", label: "Number", description: "Numeric input" },
  { type: "date", label: "Date", description: "Date picker" },
  { type: "time", label: "Time", description: "Time picker" },
  { type: "select", label: "Dropdown", description: "Single selection from a list" },
  { type: "multiselect", label: "Multi-Select", description: "Multiple selections" },
  { type: "checkbox", label: "Checkboxes", description: "Multiple checkbox options" },
  { type: "radio", label: "Radio Buttons", description: "Single selection radio" },
  { type: "toggle", label: "Yes / No", description: "Toggle switch" },
  { type: "photo", label: "Photo", description: "Camera / photo upload" },
  { type: "signature", label: "Signature", description: "Touch signature pad" },
  { type: "weather", label: "Weather", description: "Auto-fill weather from project location" },
  { type: "section-header", label: "Section Header", description: "Visual divider with title" },
  { type: "label", label: "Info Text", description: "Read-only label / instructions" },
];

export const CATEGORIES = [
  "equipment",
  "safety",
  "employee",
  "general",
];

export function createBlankField(type: FormFieldType): FormField {
  return {
    id: uid(8),
    type,
    label: "",
    required: false,
    width: "full",
    ...(["select", "multiselect", "radio", "checkbox"].includes(type)
      ? { options: [{ label: "", value: uid(4) }] }
      : {}),
  };
}

export function createBlankSection(): FormSection {
  return {
    id: uid(8),
    title: "New Section",
    fields: [],
  };
}
