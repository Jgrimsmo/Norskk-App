"use client";

import { Loader2 } from "lucide-react";

interface SavingIndicatorProps {
  saving: boolean;
}

export function SavingIndicator({ saving }: SavingIndicatorProps) {
  if (!saving) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">Saving…</span>
    </div>
  );
}
