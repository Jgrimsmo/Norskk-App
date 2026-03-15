"use client";

import * as React from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";

import type { DateRange } from "react-day-picker";

// ── Helpers ──

function matchesDateRange(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true;
  const d = new Date(dateStr + "T00:00:00");
  if (range.from && d < new Date(range.from.toDateString())) return false;
  if (range.to && d > new Date(range.to.toDateString())) return false;
  return true;
}

// ── Types ──

export interface PhotoWithDate {
  url: string;
  date: string;
  category: string;
}

// ── Component ──

export function PhotoGallery({ photos }: { photos: PhotoWithDate[] }) {
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const filtered = React.useMemo(() => {
    if (!dateRange?.from) return photos;
    return photos.filter((p) => matchesDateRange(p.date, dateRange));
  }, [photos, dateRange]);

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No photos found for this project.
      </div>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3">
        <DateColumnFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {photos.length} photos
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No photos match the selected date range.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((photo, idx) => (
            <button
              key={photo.url}
              onClick={() => setLightboxIdx(idx)}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted/30 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
            >
              <Image
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                fill
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Date overlay */}
              <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded">
                {photo.date} · {photo.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog
        open={lightboxIdx !== null}
        onOpenChange={(open) => !open && setLightboxIdx(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 border-none bg-black/95 flex items-center justify-center">
          <DialogTitle className="sr-only">Photo viewer</DialogTitle>
          {lightboxIdx !== null && (
            <>
              <Image
                src={filtered[lightboxIdx].url}
                alt={`Photo ${lightboxIdx + 1}`}
                width={1600}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
              <span className="absolute top-4 left-4 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                {lightboxIdx + 1} / {filtered.length}
              </span>
              <span className="absolute bottom-4 left-4 text-white/70 text-xs bg-black/50 px-2 py-1 rounded">
                {filtered[lightboxIdx].date} · {filtered[lightboxIdx].category}
              </span>
              {filtered.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx(
                        (lightboxIdx - 1 + filtered.length) % filtered.length
                      );
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx((lightboxIdx + 1) % filtered.length);
                    }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
