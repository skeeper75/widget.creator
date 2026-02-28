"use client";

import { useState } from "react";
import { X, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { MesStatusBadge } from "@/components/widget-builder/mes-status-badge";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

const ORDER_STATUS_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "paid", label: "Paid" },
  { value: "in_production", label: "In Production" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const ORDER_STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-100 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  shipped: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export interface OrderDetailPanelProps {
  orderId: number;
  onClose: () => void;
}

// ─── JSON pretty viewer ───────────────────────────────────────────────────────

function JsonViewer({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <pre className="bg-muted/50 rounded p-3 text-xs overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ─── OrderDetailPanel ─────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] OrderDetailPanel — shows full order details with MES controls
// @MX:REASON: Used by orders page for inline order inspection and admin override actions
export function OrderDetailPanel({ orderId, onClose }: OrderDetailPanelProps) {
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);

  const utils = trpc.useUtils();

  const orderQuery = trpc.wbOrders.getById.useQuery({ id: orderId });

  const resendMutation = trpc.wbOrders.resendToMes.useMutation({
    onSuccess: () => {
      utils.wbOrders.getById.invalidate({ id: orderId });
      utils.wbOrders.list.invalidate();
      setResendConfirmOpen(false);
      toast.success("Order queued for MES resend");
    },
    onError: (err) => {
      setResendConfirmOpen(false);
      toast.error(err.message);
    },
  });

  const overrideStatusMutation = trpc.wbOrders.overrideStatus.useMutation({
    onSuccess: () => {
      utils.wbOrders.getById.invalidate({ id: orderId });
      utils.wbOrders.list.invalidate();
      toast.success("Order status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const order = orderQuery.data;

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Order not found.
      </div>
    );
  }

  const statusColorClass =
    ORDER_STATUS_COLORS[order.status ?? "created"] ?? "bg-gray-100 text-gray-800";

  // Parse priceBreakdown for display
  const breakdown = order.priceBreakdown as Record<string, unknown> | null;

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Order: {order.orderCode}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColorClass}`}
          >
            {(order.status ?? "").replace("_", " ")}
          </span>
          <MesStatusBadge status={order.mesStatus ?? undefined} />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer info */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="font-medium">{order.productName ?? `#${order.productId}`}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{order.customerName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Price</p>
            <p className="font-semibold tabular-nums">
              ₩{Number(order.totalPrice ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* IDs row */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Shopby Order No</p>
            <p className="font-mono text-xs">{order.shopbyOrderNo ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MES Order ID</p>
            <p className="font-mono text-xs">{order.mesOrderId ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recipe Version</p>
            <p className="tabular-nums text-xs">v{order.recipeVersion}</p>
          </div>
        </div>

        <Separator />

        {/* Price breakdown */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(breakdown as any) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Price Breakdown
            </p>
            <div className="bg-muted/30 rounded p-3 text-sm space-y-1">
              {typeof breakdown!.base === "number" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base</span>
                  <span className="tabular-nums">₩{(breakdown!.base as number).toLocaleString()}</span>
                </div>
              )}
              {typeof breakdown!.postprocess === "number" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post-process</span>
                  <span className="tabular-nums">₩{(breakdown!.postprocess as number).toLocaleString()}</span>
                </div>
              )}
              {typeof breakdown!.discount === "number" && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span className="tabular-nums">-₩{Math.abs(breakdown!.discount as number).toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">₩{Number(order.totalPrice).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selections JSON */}
        <JsonViewer label="Selections" data={order.selections} />

        {/* Price breakdown JSON */}
        <JsonViewer label="Price Breakdown (raw)" data={order.priceBreakdown} />

        {order.appliedConstraints && (
          <JsonViewer label="Applied Constraints" data={order.appliedConstraints} />
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Resend to MES — only shown when mesStatus=failed */}
          {order.mesStatus === "failed" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setResendConfirmOpen(true)}
              disabled={resendMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              Resend to MES
            </Button>
          )}

          {/* Override status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={overrideStatusMutation.isPending}
              >
                Override Status
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ORDER_STATUS_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  disabled={option.value === order.status}
                  onClick={() =>
                    overrideStatusMutation.mutate({
                      orderId: order.id,
                      newStatus: option.value,
                    })
                  }
                >
                  {option.label}
                  {option.value === order.status && (
                    <span className="ml-2 text-muted-foreground text-xs">(current)</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Resend confirmation dialog */}
      <ConfirmDialog
        open={resendConfirmOpen}
        onOpenChange={(open) => { if (!open) setResendConfirmOpen(false); }}
        title="Resend to MES"
        description={`Resend order "${order.orderCode}" to MES? The MES status will be reset to 'pending' and the order will be queued for dispatch.`}
        confirmLabel="Resend"
        isLoading={resendMutation.isPending}
        onConfirm={() => resendMutation.mutate({ orderId: order.id })}
      />
    </div>
  );
}
