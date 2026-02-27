"use client";

import { type ColumnDef, flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";
import { EmptyState } from "@/components/common/empty-state";
import { useDataTable } from "@/hooks/use-data-table";

export interface DataTableProps<TData> {
  /** TanStack Table column definitions */
  columns: ColumnDef<TData, unknown>[];
  /** Data array */
  data: TData[];
  /** Placeholder text for global search input */
  searchPlaceholder?: string;
  /** Faceted filter configurations */
  filters?: FilterConfig[];
  /** Default page size (default: 20) */
  pageSize?: number;
  /** Enable server-side pagination/sorting/filtering */
  serverSide?: boolean;
  /** Total row count for server-side pagination */
  totalRows?: number;
  /** Callback for server-side state changes */
  onStateChange?: (state: {
    sorting: { id: string; desc: boolean }[];
    columnFilters: { id: string; value: unknown }[];
    globalFilter: string;
    pagination: { pageIndex: number; pageSize: number };
  }) => void;
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Additional toolbar actions (e.g. create button) */
  toolbarActions?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state action (e.g. create button) */
  emptyAction?: React.ReactNode;
  /** Page size options for pagination */
  pageSizeOptions?: number[];
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  filters,
  pageSize = 20,
  serverSide = false,
  totalRows,
  onStateChange,
  onRowClick,
  isLoading = false,
  toolbarActions,
  emptyMessage = "No results found.",
  emptyAction,
  pageSizeOptions,
}: DataTableProps<TData>) {
  const { table, globalFilter, setGlobalFilter } = useDataTable({
    data,
    columns,
    pageSize,
    serverSide,
    totalRows,
    onStateChange,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        actions={toolbarActions}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map(
                (_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={`skeleton-cell-${colIndex}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <EmptyState message={emptyMessage} action={emptyAction} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
