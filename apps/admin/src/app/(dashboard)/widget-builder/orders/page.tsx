"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MesStatusBadge } from "@/components/widget-builder/mes-status-badge";
import { OrderDetailPanel } from "@/components/widget-builder/order-detail-panel";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: number;
  orderCode: string;
  productId: number;
  productName: string | null;
  totalPrice: string;
  status: string;
  mesStatus: string | null;
  customerName: string | null;
  createdAt: Date;
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { label: "Created", value: "created" },
  { label: "Paid", value: "paid" },
  { label: "In Production", value: "in_production" },
  { label: "Shipped", value: "shipped" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const MES_STATUS_FILTER_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Sent", value: "sent" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Failed", value: "failed" },
  { label: "Not Linked", value: "not_linked" },
];

const TABLE_FILTERS = [
  { columnId: "status", title: "Status", options: STATUS_FILTER_OPTIONS },
  { columnId: "mesStatus", title: "MES Status", options: MES_STATUS_FILTER_OPTIONS },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-100 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  shipped: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// ─── OrdersPage ───────────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] OrdersPage — admin view for widget builder orders with MES status tracking
// @MX:REASON: Phase 4 orders management UI (SPEC-WIDGET-ADMIN-001)
export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const listQuery = trpc.wbOrders.list.useQuery({
    limit: 50,
    offset: 0,
  });

  const columns: ColumnDef<OrderRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">
            {row.getValue("orderCode")}
          </span>
        ),
      },
      {
        accessorKey: "productName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.getValue("productName") ?? `#${row.original.productId}`}
          </span>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Total Price" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-sm font-medium">
            ₩{Number(row.getValue("totalPrice")).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status: string = row.getValue("status");
          const colorClass = ORDER_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}
            >
              {status.replace("_", " ")}
            </span>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(row.getValue(id)),
      },
      {
        accessorKey: "mesStatus",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="MES Status" />
        ),
        cell: ({ row }) => (
          <MesStatusBadge status={row.getValue("mesStatus")} />
        ),
        filterFn: (row, id, filterValues: string[]) => {
          const val = row.getValue(id);
          return filterValues.includes(val as string);
        },
      },
      {
        accessorKey: "customerName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.getValue("customerName") ?? "—"}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as Date;
          return (
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date(date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setSelectedOrderId(
                      selectedOrderId === order.id ? null : order.id,
                    )
                  }
                >
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [selectedOrderId],
  );

  const data = (listQuery.data?.data ?? []) as OrderRow[];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Widget builder order management and MES status tracking
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            // CSV export placeholder
            toast.info("CSV export not yet implemented");
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Orders table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        filters={TABLE_FILTERS}
        searchPlaceholder="Search orders..."
        onRowClick={(row) =>
          setSelectedOrderId(selectedOrderId === row.id ? null : row.id)
        }
      />

      {/* Order detail panel */}
      {selectedOrderId !== null && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
