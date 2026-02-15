"use client";

import * as React from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBase64 } from "@/lib/firebase/storage";

interface SignaturePadProps {
  label: string;
  value: string; // download URL or base64 data URL
  onChange: (url: string) => void;
  disabled?: boolean;
  /** When provided, the signature is uploaded to Firebase Storage at this path */
  storagePath?: string;
}

export function SignaturePad({
  label,
  value,
  onChange,
  disabled = false,
  storagePath,
}: SignaturePadProps) {
  const sigRef = React.useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = React.useState(!value);
  const [uploading, setUploading] = React.useState(false);

  // When value is externally cleared, clear the pad
  React.useEffect(() => {
    if (!value && sigRef.current) {
      sigRef.current.clear();
      setIsEmpty(true);
    }
  }, [value]);

  const handleEnd = async () => {
    if (!sigRef.current) return;
    const dataUrl = sigRef.current.toDataURL("image/png");
    setIsEmpty(sigRef.current.isEmpty());

    if (storagePath) {
      setUploading(true);
      try {
        const downloadUrl = await uploadBase64(dataUrl, storagePath);
        onChange(downloadUrl);
      } catch (err) {
        console.error("Signature upload failed:", err);
        // Fallback to base64
        onChange(dataUrl);
      } finally {
        setUploading(false);
      }
    } else {
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      onChange("");
      setIsEmpty(true);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {!disabled && !isEmpty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            onClick={handleClear}
          >
            <Eraser className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      <div
        className={`rounded-md border bg-white ${disabled ? "opacity-60 pointer-events-none" : "hover:border-primary/50"}`}
      >
        {uploading ? (
          <div className="h-[80px] flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Saving signature…</span>
          </div>
        ) : value && disabled ? (
          // Show saved signature as image when disabled
          <img
            src={value}
            alt={`${label} signature`}
            className="h-[80px] w-full object-contain"
          />
        ) : (
          <SignatureCanvas
            ref={sigRef}
            penColor="#1a1a1a"
            canvasProps={{
              className: "w-full h-[80px] cursor-crosshair",
              style: { width: "100%", height: "80px" },
            }}
            onEnd={handleEnd}
          />
        )}
      </div>
    </div>
  );
}
