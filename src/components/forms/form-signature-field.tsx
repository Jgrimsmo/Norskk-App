"use client";

import * as React from "react";
import { X, Save, Eraser } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";

export function SignatureField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const sigRef = React.useRef<SignatureCanvas>(null);
  const [hasStrokes, setHasStrokes] = React.useState(false);
  const [padOpen, setPadOpen] = React.useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {value ? (
        <div className="text-center space-y-2">
          <img src={String(value)} alt="Signature" className="max-h-24 mx-auto" />
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => { onChange(""); setPadOpen(false); }}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear & Re-sign
          </Button>
        </div>
      ) : padOpen ? (
        <>
          <p className="text-xs text-muted-foreground text-center">Draw your signature below</p>
          <div className="border rounded bg-white touch-none">
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{ className: "w-full h-32" }}
              onEnd={() => setHasStrokes(true)}
            />
          </div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1.5 text-xs"
              onClick={() => {
                sigRef.current?.clear();
                setHasStrokes(false);
                setPadOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="cursor-pointer gap-1.5 text-xs"
              disabled={!hasStrokes}
              onClick={() => {
                const dataUrl = sigRef.current?.getTrimmedCanvas().toDataURL("image/png");
                if (dataUrl) onChange(dataUrl);
                setPadOpen(false);
              }}
            >
              <Save className="h-3.5 w-3.5" /> Save Signature
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-xs text-muted-foreground">No signature yet</p>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setPadOpen(true)}
          >
            <Save className="h-3.5 w-3.5" /> Tap to Sign
          </Button>
        </div>
      )}
    </div>
  );
}
