"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PdfPreviewDialog({
  url,
  name,
  loading,
  onClose,
}: {
  url: string | null;
  name: string;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!url || loading} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{name} — PDF Preview</DialogTitle>
            {url && (
              <Button
                size="sm"
                className="gap-1.5 cursor-pointer mr-6"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${name}.pdf`;
                  a.click();
                  toast.success("PDF downloaded.");
                }}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : url ? (
            <iframe
              src={url}
              title="PDF Preview"
              className="w-full h-full rounded border"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
