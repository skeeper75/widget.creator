"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { trpc } from "@/lib/trpc/client";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MesItem {
  id: number;
  itemCode: string;
  groupCode: string | null;
  name: string;
  abbreviation: string | null;
  itemType: string;
  unit: string;
  isActive: boolean;
}

interface MesItemOption {
  id: number;
  mesItemId: number;
  optionNumber: number;
  optionValue: string | null;
  isActive: boolean;
}

/**
 * MES Browser page - Read-only DataTable with expandable rows.
 * REQ-E-601: Filter by groupCode, itemType. Expandable rows show mes_item_options.
 */
export default function MesBrowserPage() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [optionsCache, setOptionsCache] = useState<Map<number, MesItemOption[]>>(
    new Map(),
  );

  const mesItemsQuery = trpc.mesItems.list.useQuery();

  const toggleExpand = async (itemId: number) => {
    const next = new Set(expandedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setExpandedIds(next);
  };

  const items = (mesItemsQuery.data ?? []) as MesItem[];

  // Collect unique values for filters
  const groupCodes = useMemo(
    () =>
      [...new Set(items.map((i) => i.groupCode).filter(Boolean) as string[])].map(
        (g) => ({ label: g, value: g }),
      ),
    [items],
  );

  const itemTypes = useMemo(
    () =>
      [...new Set(items.map((i) => i.itemType))].map((t) => ({
        label: t,
        value: t,
      })),
    [items],
  );

  const columns: ColumnDef<MesItem, unknown>[] = useMemo(
    () => [
      {
        id: "expand",
        header: "",
        size: 40,
        cell: ({ row }) => {
          const isExpanded = expandedIds.has(row.original.id);
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toggleExpand(row.original.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          );
        },
      },
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "itemCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Item Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("itemCode")}</span>
        ),
      },
      {
        accessorKey: "groupCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Group" />
        ),
        cell: ({ row }) => row.original.groupCode ?? "-",
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "abbreviation",
        header: "Abbr",
        cell: ({ row }) => row.original.abbreviation ?? "-",
        size: 80,
      },
      {
        accessorKey: "itemType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("itemType")}</Badge>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        size: 60,
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
        size: 80,
      },
    ],
    [expandedIds],
  );

  if (mesItemsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MES Browser</h1>
          <p className="text-muted-foreground">Browse MES items (read-only)</p>
        </div>
        <LoadingSkeleton variant="table" rows={10} columns={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MES Browser</h1>
        <p className="text-muted-foreground">
          Browse MES items (read-only) — {items.length} items
        </p>
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="Search by name or item code..."
        filters={[
          { columnId: "groupCode", title: "Group Code", options: groupCodes },
          { columnId: "itemType", title: "Item Type", options: itemTypes },
        ]}
      />

      {/* Expanded row detail panels */}
      {expandedIds.size > 0 && (
        <div className="space-y-2">
          {Array.from(expandedIds).map((itemId) => (
            <ExpandedMesItemOptions key={itemId} mesItemId={itemId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpandedMesItemOptions({ mesItemId }: { mesItemId: number }) {
  const optionsQuery = trpc.mesItems.getWithOptions.useQuery({ id: mesItemId });

  if (optionsQuery.isLoading) {
    return (
      <div className="ml-10 rounded-md border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">Loading options...</p>
      </div>
    );
  }

  const data = optionsQuery.data;
  if (!data) return null;

  const options = data.options ?? [];

  return (
    <div className="ml-10 rounded-md border bg-muted/30 p-3">
      <h4 className="text-sm font-semibold mb-2">
        Options for {data.name} ({data.itemCode})
      </h4>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No options defined</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {options.map((opt) => (
            <div
              key={opt.id}
              className="rounded border bg-white px-2 py-1 text-xs"
            >
              <span className="font-mono text-muted-foreground">
                Opt {opt.optionNumber}:
              </span>{" "}
              {opt.optionValue ?? "-"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
