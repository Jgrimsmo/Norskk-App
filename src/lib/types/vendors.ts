export type VendorType = "vendor" | "subcontractor";

export interface Vendor {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  type?: VendorType;
}
