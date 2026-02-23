"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ActiveFilterValue = "all" | "active" | "inactive";

interface ActiveToggleProps {
  /** Current filter value */
  value: ActiveFilterValue;
  /** Callback when filter changes */
  onChange: (value: ActiveFilterValue) => void;
}

/**
 * isActive filter toggle for list pages.
 * REQ-U-007: Active/Inactive/All data filter on every list page.
 */
export function ActiveToggle({ value, onChange }: ActiveToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as ActiveFilterValue);
      }}
      className="h-8"
    >
      <ToggleGroupItem value="all" aria-label="Show all" className="h-8 px-3 text-xs">
        All
      </ToggleGroupItem>
      <ToggleGroupItem
        value="active"
        aria-label="Show active only"
        className="h-8 px-3 text-xs"
      >
        Active
      </ToggleGroupItem>
      <ToggleGroupItem
        value="inactive"
        aria-label="Show inactive only"
        className="h-8 px-3 text-xs"
      >
        Inactive
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
