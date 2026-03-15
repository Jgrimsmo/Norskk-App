"use client";

import * as React from "react";
import { X, Search, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import type { FormField, FormFieldOption } from "@/lib/types/time-tracking";

export function DataSourceField({
  field,
  value,
  onChange,
  options,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  options: FormFieldOption[];
}) {
  const isMulti = field.type === "multiselect" || field.type === "checkbox";
  const [search, setSearch] = React.useState("");
  const [customInput, setCustomInput] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = isMulti
    ? (Array.isArray(value) ? (value as string[]) : [])
    : [];
  const singleValue = !isMulti ? String(value ?? "") : "";

  // Combine real options + any custom values already selected
  const allOptionValues = new Set(options.map((o) => o.value));
  const customSelected = isMulti
    ? selected.filter((v) => !allOptionValues.has(v))
    : singleValue && !allOptionValues.has(singleValue)
      ? [singleValue]
      : [];
  const customOptions: FormFieldOption[] = customSelected.map((v) => ({ value: v, label: v }));
  const allOptions = [...options, ...customOptions];

  const filtered = search.trim()
    ? allOptions.filter((o) =>
        o.label.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const toggleOption = (optValue: string) => {
    if (isMulti) {
      onChange(
        selected.includes(optValue)
          ? selected.filter((v) => v !== optValue)
          : [...selected, optValue]
      );
    } else {
      onChange(optValue);
    }
    setSearch("");
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (isMulti) {
      if (!selected.includes(name)) {
        onChange([...selected, name]);
      }
    } else {
      onChange(name);
    }
    setCustomInput("");
    setSearch("");
  };

  const resolveLabel = (v: string) => {
    const opt = allOptions.find((o) => o.value === v);
    return opt?.label || v;
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {/* Selected chips (multi) */}
      {isMulti && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
            >
              {resolveLabel(v)}
              <button
                type="button"
                onClick={() => toggleOption(v)}
                className="hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selected display (single) */}
      {!isMulti && singleValue && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="flex-1">{resolveLabel(singleValue)}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search input + results + custom entry (hidden for single-select when value is set) */}
      {(isMulti || !singleValue) && (
        <>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={field.placeholder || "Search…"}
              className="h-9 text-sm pl-8"
            />
          </div>

          {/* Search results dropdown */}
          {search.trim().length > 0 && (
            <div className="rounded-lg border bg-popover shadow-md max-h-[200px] overflow-y-auto">
              {filtered.length > 0 ? (
                <div className="p-1.5 space-y-0.5">
                  {filtered.map((opt) => {
                    const isChecked = isMulti
                      ? selected.includes(opt.value)
                      : singleValue === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        {isMulti ? (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOption(opt.value)}
                            className="h-3.5 w-3.5"
                          />
                        ) : (
                          <input
                            type="radio"
                            checked={isChecked}
                            onChange={() => toggleOption(opt.value)}
                            className="accent-primary h-3.5 w-3.5"
                          />
                        )}
                        <span className={isChecked ? "font-medium" : ""}>
                          {opt.label || opt.value}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No results found
                </p>
              )}
            </div>
          )}

          {/* Add custom name */}
          <div className="flex items-center gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add a name not in the list…"
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 shrink-0 cursor-pointer"
              onClick={addCustom}
              disabled={!customInput.trim()}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
