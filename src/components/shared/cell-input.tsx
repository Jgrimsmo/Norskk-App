import { memo } from "react";
import { Input } from "@/components/ui/input";

interface CellInputProps {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric" | "search" | "tel" | "email" | "url";
}

export const CellInput = memo(function CellInput({
  value,
  onChange,
  type = "text",
  className = "",
  placeholder = "",
  inputMode,
}: CellInputProps) {
  return (
    <Input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-[32px] text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none focus:ring-0 focus:border-primary focus-visible:ring-0 hover:border-muted-foreground/30 ${className}`}
    />
  );
});
