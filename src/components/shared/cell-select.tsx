import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CellSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}

export const CellSelect = memo(function CellSelect({
  value,
  onChange,
  options,
  placeholder,
}: CellSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-[32px] w-full text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none focus:ring-0 focus:border-primary hover:border-muted-foreground/30 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={0}
        className="max-h-[240px] min-w-[var(--radix-select-trigger-width)] rounded-sm border shadow-lg"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.id}
            value={opt.id}
            className="text-xs py-1.5 px-2 cursor-pointer"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
