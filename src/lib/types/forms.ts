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
  | "weather"
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
  requireEquipment?: boolean;    // must select equipment when filling
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
  equipmentId?: string;
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
