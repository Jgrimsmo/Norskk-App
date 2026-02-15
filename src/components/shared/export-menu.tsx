"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  onExportExcel: () => void;
  onExportCSV: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
}

export function ExportMenu({
  onExportExcel,
  onExportCSV,
  onExportPDF,
  disabled,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          disabled={disabled}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={onExportExcel}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onExportCSV}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4 text-blue-600" />
          Export to CSV
        </DropdownMenuItem>
        {onExportPDF && (
          <DropdownMenuItem
            onClick={onExportPDF}
            className="gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-red-600" />
            Export to PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
