"use client";

import { type Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import {
  DataTableFacetedFilter,
  type FacetedFilterOption,
} from "./data-table-faceted-filter";

export interface FilterConfig {
  /** Column id to apply the filter to */
  columnId: string;
  /** Display title for the filter */
  title: string;
  /** Options for faceted filter */
  options: FacetedFilterOption[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  /** Global search value (controlled externally via useDataTable) */
  globalFilter: string;
  /** Setter for global search value */
  onGlobalFilterChange: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Faceted filter configurations */
  filters?: FilterConfig[];
  /** Additional toolbar actions (e.g. create button) */
  actions?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder = "Search...",
  filters = [],
  actions,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(event) => onGlobalFilterChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filters.map((filter) => {
          const column = table.getColumn(filter.columnId);
          if (!column) return null;
          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          );
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              onGlobalFilterChange("");
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {actions}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
