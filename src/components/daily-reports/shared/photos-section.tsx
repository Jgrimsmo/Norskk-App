"use client";

import * as React from "react";
import { Camera, Sunrise, Hammer, Moon } from "lucide-react";

import { PhotoUpload } from "@/components/shared/photo-upload";

interface PhotosSectionProps {
  reportId: string;
  morningPhotos: string[];
  workPhotos: string[];
  endOfDayPhotos: string[];
  onMorningChange: (urls: string[]) => void;
  onWorkChange: (urls: string[]) => void;
  onEndOfDayChange: (urls: string[]) => void;
  disabled?: boolean;
  /** "grid" for side-by-side (desktop), "stack" for vertical (mobile) */
  layout?: "grid" | "stack";
}

export function PhotosSection({
  reportId,
  morningPhotos,
  workPhotos,
  endOfDayPhotos,
  onMorningChange,
  onWorkChange,
  onEndOfDayChange,
  disabled,
  layout = "grid",
}: PhotosSectionProps) {
  const totalPhotos = morningPhotos.length + workPhotos.length + endOfDayPhotos.length;

  const containerClass =
    layout === "grid"
      ? "grid grid-cols-1 md:grid-cols-3 gap-4"
      : "space-y-3";

  return (
    <section>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Camera className="h-4 w-4 text-sky-500" />
        Photos ({totalPhotos})
      </h3>
      <div className={containerClass}>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Sunrise className="h-3.5 w-3.5 text-amber-500" />
            Morning ({morningPhotos.length})
          </div>
          <PhotoUpload
            photos={morningPhotos}
            onChange={onMorningChange}
            storagePath={`daily-reports/${reportId}/morning`}
            disabled={disabled}
            maxPhotos={10}
          />
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Hammer className="h-3.5 w-3.5 text-orange-500" />
            Work Hours ({workPhotos.length})
          </div>
          <PhotoUpload
            photos={workPhotos}
            onChange={onWorkChange}
            storagePath={`daily-reports/${reportId}/work`}
            disabled={disabled}
            maxPhotos={10}
          />
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Moon className="h-3.5 w-3.5 text-indigo-500" />
            End of Day ({endOfDayPhotos.length})
          </div>
          <PhotoUpload
            photos={endOfDayPhotos}
            onChange={onEndOfDayChange}
            storagePath={`daily-reports/${reportId}/eod`}
            disabled={disabled}
            maxPhotos={10}
          />
        </div>
      </div>
    </section>
  );
}
