"use client";

import * as React from "react";
import { Camera, X, Loader2, ImageIcon, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFiles } from "@/lib/firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PhotoUploadProps {
  /** Array of download URLs for already-uploaded photos */
  photos: string[];
  /** Called when photos array changes (add or remove) */
  onChange: (urls: string[]) => void;
  /** Storage path prefix, e.g. "daily-reports/dr-123" */
  storagePath: string;
  /** Disable all interactions */
  disabled?: boolean;
  /** Max number of photos allowed (default: 20) */
  maxPhotos?: number;
}

export function PhotoUpload({
  photos,
  onChange,
  storagePath,
  disabled = false,
  maxPhotos = 20,
}: PhotoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    if (viewerIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setViewerIndex((i) =>
          i !== null ? (i === photos.length - 1 ? 0 : i + 1) : null
        );
      else if (e.key === "ArrowLeft")
        setViewerIndex((i) =>
          i !== null ? (i === 0 ? photos.length - 1 : i - 1) : null
        );
      else if (e.key === "Escape") setViewerIndex(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerIndex, photos.length]);

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArr.length === 0) {
        toast.error("Only image files are allowed");
        return;
      }
      const remaining = maxPhotos - photos.length;
      if (fileArr.length > remaining) {
        toast.error(`You can only add ${remaining} more photo(s)`);
        return;
      }
      setUploading(true);
      try {
        const urls = await uploadFiles(fileArr, storagePath);
        onChange([...photos, ...urls]);
        toast.success(`${urls.length} photo(s) uploaded`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to upload photos");
      } finally {
        setUploading(false);
      }
    },
    [photos, onChange, storagePath, maxPhotos]
  );

  const removePhoto = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url, idx) => (
            <div key={idx} className="group relative aspect-square rounded-md overflow-hidden border">
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="h-full w-full object-cover cursor-pointer"
                onClick={() => setViewerIndex(idx)}
              />
              <button
                type="button"
                onClick={() => setViewerIndex(idx)}
                className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(idx);
                  }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / Upload button */}
      {!disabled && photos.length < maxPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {photos.length === 0 ? (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              )}
              <p className="text-xs text-muted-foreground">
                {photos.length === 0
                  ? "Drag & drop photos or click to browse"
                  : "Add more photos"}
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* ── Lightbox Viewer ── */}
      <Dialog
        open={viewerIndex !== null}
        onOpenChange={(open) => {
          if (!open) setViewerIndex(null);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden bg-black/95 border-none [&>button]:text-white [&>button]:hover:text-white/80">
          <DialogTitle className="sr-only">
            Photo {viewerIndex !== null ? viewerIndex + 1 : ""} of {photos.length}
          </DialogTitle>

          {viewerIndex !== null && (
            <div
              className="relative flex items-center justify-center w-full h-[90vh]"
              onClick={() => setViewerIndex(null)}
            >
              {/* Image */}
              <img
                src={photos[viewerIndex]}
                alt={`Photo ${viewerIndex + 1}`}
                className="max-w-full max-h-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Counter */}
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium bg-black/40 rounded-full px-3 py-1">
                {viewerIndex + 1} / {photos.length}
              </span>

              {/* Prev */}
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex(
                      viewerIndex === 0 ? photos.length - 1 : viewerIndex - 1
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Next */}
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex(
                      viewerIndex === photos.length - 1 ? 0 : viewerIndex + 1
                    );
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
