"use client";

import * as React from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { uploadFile } from "@/lib/firebase/storage";
import { type Invoice, type BillingType, type Project, type Vendor, type CostCode } from "@/lib/types/time-tracking";

interface InvoiceEditDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  vendors: Vendor[];
  costCodes: CostCode[];
  onSave: (id: string, updates: Partial<Invoice>) => void;
}

export function InvoiceEditDialog({
  invoice,
  open,
  onOpenChange,
  projects,
  vendors,
  costCodes,
  onSave,
}: InvoiceEditDialogProps) {
  const [projectId, setProjectId] = React.useState("");
  const [vendorId, setVendorId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState("");
  const [costCodeId, setCostCodeId] = React.useState("");
  const [billingType, setBillingType] = React.useState<BillingType | "">("");
  const [notes, setNotes] = React.useState("");
  const [newFile, setNewFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Populate form whenever the invoice changes
  React.useEffect(() => {
    if (invoice && open) {
      setProjectId(invoice.projectId);
      setVendorId(invoice.vendorId);
      setAmount(String(invoice.amount));
      setDate(invoice.date);
      setCostCodeId(invoice.costCodeId ?? "");
      setBillingType(invoice.billingType ?? "");
      setNotes(invoice.notes ?? "");
      setNewFile(null);
    }
  }, [invoice, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    setNewFile(f);
  };

  const handleSave = async () => {
    if (!invoice) return;
    if (!vendorId) { toast.error("Please select a vendor"); return; }
    if (!amount || isNaN(parseFloat(amount))) { toast.error("Please enter a valid amount"); return; }
    if (!date) { toast.error("Please select a date"); return; }

    setSaving(true);
    try {
      let fileUrl = invoice.fileUrl;
      let fileName = invoice.fileName;

      if (newFile) {
        const path = `invoices/${invoice.id}/${newFile.name}`;
        fileUrl = await uploadFile(newFile, path);
        fileName = newFile.name;
      }

      const updates: Partial<Invoice> = {
        projectId,
        vendorId,
        amount: parseFloat(amount),
        date,
        fileUrl,
        fileName,
        ...(costCodeId ? { costCodeId } : { costCodeId: undefined }),
        ...(billingType ? { billingType } : { billingType: undefined }),
        ...(notes ? { notes } : { notes: undefined }),
      };

      onSave(invoice.id, updates);
      toast.success("Invoice updated");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Filter cost codes to the project's payables codes if set
  const selectedProject = projects.find((p) => p.id === projectId);
  const payablesIds = selectedProject?.payablesCostCodeIds;
  const filteredCodes =
    payablesIds && payablesIds.length > 0
      ? costCodes.filter((c) => payablesIds.includes(c.id))
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label>Vendor <span className="text-red-500">*</span></Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select vendor…" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ($) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Cost Code */}
          <div className="space-y-1.5">
            <Label>Cost Code</Label>
            <Select
              value={costCodeId || "__none__"}
              onValueChange={(v) => setCostCodeId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select cost code (optional)…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No cost code</SelectItem>
                {filteredCodes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.description}
                  </SelectItem>
                ))}
                {filteredCodes.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    No payables cost codes set for this project.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Type */}
          <div className="space-y-1.5">
            <Label>Billing Type</Label>
            <Select value={billingType || "__none__"} onValueChange={(v) => setBillingType(v === "__none__" ? "" : v as BillingType)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select billing type (optional)…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="tm">T&amp;M</SelectItem>
                <SelectItem value="lump-sum">Lump Sum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* PDF — optional replacement */}
          <div className="space-y-1.5">
            <Label>Replace PDF <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {newFile ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                <span className="flex-1 truncate">{newFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setNewFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-sm border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose new PDF…
                </Button>
                {invoice && (
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground" asChild>
                    <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-3.5 w-3.5" />
                      Current
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
