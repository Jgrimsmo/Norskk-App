"use client";

import * as React from "react";
import { format } from "date-fns";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormField, FormFieldOption } from "@/lib/types/time-tracking";
import { DataSourceField } from "./form-data-source-field";
import { SignatureField } from "./form-signature-field";

export function RenderField({
  field,
  value,
  onChange,
  resolvedOptions,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  resolvedOptions?: FormFieldOption[];
}) {
  const options = resolvedOptions || field.options || [];

  // Use search-based UI for data-sourced fields
  if (field.optionsSource && resolvedOptions) {
    return (
      <DataSourceField
        field={field}
        value={value}
        onChange={onChange}
        options={resolvedOptions}
      />
    );
  }

  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "textarea":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "date":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs cursor-pointer"
            onClick={() => onChange(format(new Date(), "yyyy-MM-dd"))}
          >
            Today
          </Button>
        </div>
      );

    case "time":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs cursor-pointer"
            onClick={() => onChange(format(new Date(), "HH:mm"))}
          >
            Now
          </Button>
        </div>
      );

    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const checked = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked.includes(opt.value)}
                onCheckedChange={(c) => {
                  onChange(
                    c
                      ? [...checked, opt.value]
                      : checked.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-primary"
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true || value === "true" || value === "yes"}
            onCheckedChange={(v: boolean) => onChange(v)}
          />
          <span className="text-sm text-muted-foreground">
            {value === true || value === "true" || value === "yes" ? "Yes" : "No"}
          </span>
        </div>
      );

    case "photo": {
      const photos = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Camera className="h-3.5 w-3.5" />
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    onChange([...photos, reader.result]);
                  }
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      );
    }

    case "signature": {
      return <SignatureField value={value} onChange={onChange} />;
    }

    case "weather":
      return null; // rendered by WeatherField wrapper in form sections

    case "section-header":
      return null; // rendered separately

    case "label":
      return null; // rendered as text only

    default:
      return <p className="text-xs text-muted-foreground">Unsupported field type</p>;
  }
}
