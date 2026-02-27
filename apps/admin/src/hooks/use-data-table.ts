"use client";

import { useState, useMemo } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  type RowSelectionState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDebounce } from "./use-debounce";

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  /** Default page size (default: 20) */
  pageSize?: number;
  /** Enable server-side mode (pagination, sorting, filtering handled externally) */
  serverSide?: boolean;
  /** Total row count for server-side pagination */
  totalRows?: number;
  /** Callback for server-side state changes */
  onStateChange?: (state: DataTableState) => void;
}

export interface DataTableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  pagination: PaginationState;
}

export function useDataTable<TData>({
  data,
  columns,
  pageSize = 20,
  serverSide = false,
  totalRows,
  onStateChange,
}: UseDataTableOptions<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  // Notify parent of state changes for server-side mode
  const handleSortingChange = (updater: React.SetStateAction<SortingState>) => {
    setSorting((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (serverSide && onStateChange) {
        onStateChange({
          sorting: next,
          columnFilters,
          globalFilter: debouncedGlobalFilter,
          pagination,
        });
      }
      return next;
    });
  };

  const handleColumnFiltersChange = (
    updater: React.SetStateAction<ColumnFiltersState>
  ) => {
    setColumnFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (serverSide && onStateChange) {
        onStateChange({
          sorting,
          columnFilters: next,
          globalFilter: debouncedGlobalFilter,
          pagination: { ...pagination, pageIndex: 0 },
        });
      }
      // Reset to first page on filter change
      setPagination((p) => ({ ...p, pageIndex: 0 }));
      return next;
    });
  };

  const handlePaginationChange = (
    updater: React.SetStateAction<PaginationState>
  ) => {
    setPagination((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (serverSide && onStateChange) {
        onStateChange({
          sorting,
          columnFilters,
          globalFilter: debouncedGlobalFilter,
          pagination: next,
        });
      }
      return next;
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: debouncedGlobalFilter,
      pagination,
    },
    ...(serverSide
      ? {
          manualPagination: true,
          manualSorting: true,
          manualFiltering: true,
          pageCount: totalRows
            ? Math.ceil(totalRows / pagination.pageSize)
            : -1,
        }
      : {}),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    ...(!serverSide
      ? {
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
        }
      : {}),
  });

  const pageCount = useMemo(() => {
    if (serverSide && totalRows) {
      return Math.ceil(totalRows / pagination.pageSize);
    }
    return table.getPageCount();
  }, [serverSide, totalRows, pagination.pageSize, table]);

  return {
    table,
    globalFilter,
    setGlobalFilter,
    pageCount,
  };
}
