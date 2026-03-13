export type NotificationType = "dispatch-assigned" | "dispatch-changed" | "dispatch-removed";

export interface AppNotification {
  id: string;
  recipientId: string;    // employee ID
  type: NotificationType;
  title: string;
  body: string;
  dispatchId?: string;
  projectId?: string;
  date?: string;           // relevant date (ISO YYYY-MM-DD)
  read: boolean;
  createdAt: string;       // ISO datetime
}
