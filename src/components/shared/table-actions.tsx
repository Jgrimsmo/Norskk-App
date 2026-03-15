"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** If true, this action is available even when no rows are selected */
  alwaysEnabled?: boolean;
  /** If true, renders with destructive styling (red text) */
  destructive?: boolean;
  /** If true, renders a separator before this action */
  separatorBefore?: boolean;
}

interface TableActionsProps {
  actions: TableAction[];
  selectedCount: number;
}

export function TableActions({ actions, selectedCount }: TableActionsProps) {
  const enabledActions = actions.filter(
    (a) => a.alwaysEnabled || selectedCount > 0
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          disabled={enabledActions.length === 0}
        >
          Actions
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => {
          const disabled = !action.alwaysEnabled && selectedCount === 0;
          return (
            <React.Fragment key={action.label}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={action.onClick}
                disabled={disabled}
                className={`text-xs gap-2 cursor-pointer ${action.destructive ? "text-destructive focus:text-destructive" : ""}`}
              >
                {action.icon}
                {action.label}
                {!action.alwaysEnabled && selectedCount > 0 && (
                  <span className="ml-auto text-muted-foreground">
                    ({selectedCount})
                  </span>
                )}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
