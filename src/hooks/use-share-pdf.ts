"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Hook that generates a PDF blob URL, then shares it via the
 * Web Share API (native share sheet on mobile) or falls back to download.
 */
export function useSharePDF() {
  const [sharing, setSharing] = useState(false);

  /**
   * @param generate  – async function that returns an object‐URL (blob URL)
   * @param filename  – desired PDF filename (e.g. "safety-form-2026-03-14.pdf")
   */
  const sharePDF = async (
    generate: () => Promise<string>,
    filename: string,
  ) => {
    setSharing(true);
    let blobUrl: string | null = null;
    try {
      blobUrl = await generate();

      // Convert object URL → File for the share sheet
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/pdf" });

      // Try native share (mobile)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        toast.success("Shared successfully.");
      } else {
        // Fallback: direct download
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();
        toast.success("PDF downloaded.");
      }
    } catch (err: unknown) {
      // User cancelled the share sheet — not an error
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Failed to generate PDF.");
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setSharing(false);
    }
  };

  return { sharePDF, sharing };
}
