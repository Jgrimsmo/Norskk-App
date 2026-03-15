import { format } from "date-fns";
import type { DailyReport } from "@/lib/types/time-tracking";

export function nextDailyReportId(): string {
  return `dr-${crypto.randomUUID().slice(0, 8)}`;
}

export function createBlankReport(authorId: string): DailyReport {
  const now = new Date();
  return {
    id: nextDailyReportId(),
    reportNumber: Math.floor(Math.random() * 9000) + 1000,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    projectId: "",
    authorId,
    weather: {
      temperature: "",
      conditions: [],
      windSpeed: "",
      precipitation: "",
      groundConditions: "dry",
      weatherDelay: false,
      delayHours: 0,
      notes: "",
    },
    workDescription: "",
    morningPhotoUrls: [],
    workPhotoUrls: [],
    endOfDayPhotoUrls: [],
    onSiteStaff: [],
    onSiteEquipment: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
