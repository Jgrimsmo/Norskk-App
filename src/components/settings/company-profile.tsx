"use client";

import * as React from "react";
import Image from "next/image";
import { Building2, CalendarDays, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Collections } from "@/lib/firebase/collections";
import { getById, create, update } from "@/lib/firebase/firestore";
import { uploadFile } from "@/lib/firebase/storage";
import type { CompanyProfile, PayPeriodType } from "@/lib/types/time-tracking";

const BLANK: CompanyProfile = {
  id: "default",
  name: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  phone: "",
  email: "",
  website: "",
  logoUrl: "",
  payPeriodType: "bi-weekly",
  payPeriodStartDate: "",
};

export function CompanyProfileSettings() {
  const [profile, setProfile] = React.useState<CompanyProfile>(BLANK);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Load on mount
  React.useEffect(() => {
    (async () => {
      try {
        const doc = await getById<CompanyProfile>(
          Collections.COMPANY_PROFILE,
          "default"
        );
        if (doc) setProfile(doc);
      } catch {
        // First time — no profile yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = <K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const url = await uploadFile(file, `company/logo.${ext}`);
      updateField("logoUrl", url);
      toast.success("Logo uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if document exists
      const existing = await getById<CompanyProfile>(
        Collections.COMPANY_PROFILE,
        "default"
      );
      if (existing) {
        await update(Collections.COMPANY_PROFILE, "default", profile);
      } else {
        await create(Collections.COMPANY_PROFILE, profile);
      }
      toast.success("Company profile saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your company details are shown on reports and forms.
        </p>
      </div>

      <Separator />

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Company Logo</Label>
        <div className="flex items-center gap-4">
          {profile.logoUrl ? (
            <div className="relative group">
              <Image
                src={profile.logoUrl}
                alt="Company logo"
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg object-contain border bg-white p-1"
              />
              <button
                type="button"
                onClick={() => updateField("logoUrl", "")}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
              <Building2 className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs cursor-pointer"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploadingLogo ? "Uploading…" : "Upload Logo"}
          </Button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      {/* Form fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs font-medium">Company Name</Label>
          <Input
            value={profile.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Norskk Construction Ltd."
            className="h-9 text-sm"
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs font-medium">Street Address</Label>
          <Input
            value={profile.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="123 Industrial Blvd"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">City</Label>
          <Input
            value={profile.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Edmonton"
            className="h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Province</Label>
            <Input
              value={profile.province}
              onChange={(e) => updateField("province", e.target.value)}
              placeholder="AB"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Postal Code</Label>
            <Input
              value={profile.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="T5A 0A1"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Phone</Label>
          <Input
            value={profile.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="(780) 555-0100"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Email</Label>
          <Input
            type="email"
            value={profile.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="info@norskk.ca"
            className="h-9 text-sm"
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs font-medium">Website</Label>
          <Input
            value={profile.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://norskk.ca"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Pay Period */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Pay Period
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure your company&apos;s pay cycle. This is used to filter time entries by pay period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Pay Period Type</Label>
          <Select
            value={profile.payPeriodType}
            onValueChange={(v) => updateField("payPeriodType", v as PayPeriodType)}
          >
            <SelectTrigger className="h-9 text-sm cursor-pointer">
              <SelectValue placeholder="Select period type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
              <SelectItem value="semi-monthly">Semi-Monthly (1st & 16th)</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(profile.payPeriodType === "weekly" || profile.payPeriodType === "bi-weekly") && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Period Start Date</Label>
            <Input
              type="date"
              value={profile.payPeriodStartDate}
              onChange={(e) => updateField("payPeriodStartDate", e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Pick any date that falls on the first day of a pay period.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
