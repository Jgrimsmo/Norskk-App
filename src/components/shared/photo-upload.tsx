"use client";

import * as React from "react";
import { Camera, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFiles } from "@/lib/firebase/storage";
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
                className="h-full w-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
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
    </div>
  );
}
