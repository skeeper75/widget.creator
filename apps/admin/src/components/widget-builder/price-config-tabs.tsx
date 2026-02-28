"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceConfigTabsProps {
  productId: number;
  productName: string;
}

// ─── Print Cost Base tab ──────────────────────────────────────────────────────

function PrintCostBaseTab({ productId }: { productId: number }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.pricing.listPrintCostBase.useQuery({ productId });

  const batchUpsertMutation = trpc.pricing.batchUpsertPrintCostBase.useMutation({
    onSuccess: () => {
      utils.pricing.listPrintCostBase.invalidate({ productId });
      toast.success("Print cost base saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage base print costs by plate type and print mode.
        </p>
        <Button
          size="sm"
          className="gap-2"
          disabled={batchUpsertMutation.isPending || listQuery.isLoading}
          onClick={() => {
            batchUpsertMutation.mutate({
              productId,
              rows: rows.map((r) => ({
                plateType: r.plateType,
                printMode: r.printMode,
                qtyMin: r.qtyMin,
                qtyMax: r.qtyMax,
                unitPrice: String(r.unitPrice),
              })),
            });
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No print cost base rows configured for this product.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 text-xs font-semibold">Plate Type</th>
                <th className="text-left p-2 text-xs font-semibold">Print Mode</th>
                <th className="text-right p-2 text-xs font-semibold">Qty Min</th>
                <th className="text-right p-2 text-xs font-semibold">Qty Max</th>
                <th className="text-right p-2 text-xs font-semibold">Unit Price (₩)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/20">
                  <td className="p-2 font-mono text-xs">{row.plateType}</td>
                  <td className="p-2">{row.printMode}</td>
                  <td className="p-2 text-right tabular-nums">{row.qtyMin.toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">{row.qtyMax.toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">
                    ₩{Number(row.unitPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Postprocess Cost tab ─────────────────────────────────────────────────────

function PostprocessCostTab({ productId }: { productId: number }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.pricing.listPostprocessCost.useQuery({ productId });

  const batchUpsertMutation = trpc.pricing.batchUpsertPostprocessCost.useMutation({
    onSuccess: () => {
      utils.pricing.listPostprocessCost.invalidate({ productId });
      toast.success("Postprocess costs saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage post-processing (후가공) costs for this product.
        </p>
        <Button
          size="sm"
          className="gap-2"
          disabled={batchUpsertMutation.isPending || listQuery.isLoading}
          onClick={() => {
            batchUpsertMutation.mutate({
              productId,
              rows: rows.map((r) => ({
                processCode: r.processCode,
                processNameKo: r.processNameKo,
                qtyMin: r.qtyMin ?? 0,
                qtyMax: r.qtyMax ?? 999999,
                unitPrice: String(r.unitPrice),
                priceType: (r.priceType ?? "fixed") as "fixed" | "per_unit" | "per_sqm",
              })),
            });
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No postprocess costs configured for this product.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 text-xs font-semibold">Process Code</th>
                <th className="text-left p-2 text-xs font-semibold">Name (KO)</th>
                <th className="text-right p-2 text-xs font-semibold">Qty Min</th>
                <th className="text-right p-2 text-xs font-semibold">Qty Max</th>
                <th className="text-right p-2 text-xs font-semibold">Unit Price (₩)</th>
                <th className="text-left p-2 text-xs font-semibold">Price Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/20">
                  <td className="p-2 font-mono text-xs">{row.processCode}</td>
                  <td className="p-2">{row.processNameKo}</td>
                  <td className="p-2 text-right tabular-nums">{(row.qtyMin ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">{(row.qtyMax ?? 999999).toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">
                    ₩{Number(row.unitPrice).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {row.priceType ?? "fixed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Qty Discount tab ─────────────────────────────────────────────────────────

function QtyDiscountTab({ productId }: { productId: number }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.pricing.listQtyDiscount.useQuery({ productId });

  const batchUpsertMutation = trpc.pricing.batchUpsertQtyDiscount.useMutation({
    onSuccess: () => {
      utils.pricing.listQtyDiscount.invalidate({ productId });
      toast.success("Quantity discounts saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage quantity-based discount tiers for this product.
        </p>
        <Button
          size="sm"
          className="gap-2"
          disabled={batchUpsertMutation.isPending || listQuery.isLoading}
          onClick={() => {
            batchUpsertMutation.mutate({
              productId,
              rows: rows.map((r) => ({
                qtyMin: r.qtyMin,
                qtyMax: r.qtyMax,
                discountRate: String(r.discountRate),
                discountLabel: r.discountLabel ?? null,
                displayOrder: r.displayOrder,
              })),
            });
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No quantity discounts configured for this product.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-right p-2 text-xs font-semibold">Qty Min</th>
                <th className="text-right p-2 text-xs font-semibold">Qty Max</th>
                <th className="text-right p-2 text-xs font-semibold">Discount Rate</th>
                <th className="text-left p-2 text-xs font-semibold">Label</th>
                <th className="text-right p-2 text-xs font-semibold">Display Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/20">
                  <td className="p-2 text-right tabular-nums">{row.qtyMin.toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">{row.qtyMax.toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums text-green-700">
                    {(Number(row.discountRate) * 100).toFixed(2)}%
                  </td>
                  <td className="p-2">{row.discountLabel ?? "—"}</td>
                  <td className="p-2 text-right tabular-nums">{row.displayOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Addon Prices tab ─────────────────────────────────────────────────────────

function AddonPricesTab({ productId }: { productId: number }) {
  // Addon price overrides are managed through addonGroupItems
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <p>Addon pricing is managed through the Addon Groups page.</p>
      <p className="mt-1 text-xs">
        Navigate to Widget Builder &rarr; Addons to configure per-product price overrides.
      </p>
    </div>
  );
}

// ─── PriceConfigTabs ─────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] PriceConfigTabs — tabbed UI for pricing tables (print costs, postprocess, qty discount, addons)
// @MX:REASON: Aggregates 4 pricing tables into single product-scoped view (SPEC-WIDGET-ADMIN-001 Phase 4)
export function PriceConfigTabs({ productId, productName }: PriceConfigTabsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{productName}</h2>
        <p className="text-sm text-muted-foreground">Price configuration tables</p>
      </div>

      <Tabs defaultValue="print-cost">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="print-cost">기본 인쇄단가</TabsTrigger>
          <TabsTrigger value="postprocess">후가공 단가</TabsTrigger>
          <TabsTrigger value="qty-discount">수량 할인</TabsTrigger>
          <TabsTrigger value="addon-price">애드온 가격</TabsTrigger>
        </TabsList>

        <TabsContent value="print-cost" className="mt-4">
          <PrintCostBaseTab productId={productId} />
        </TabsContent>

        <TabsContent value="postprocess" className="mt-4">
          <PostprocessCostTab productId={productId} />
        </TabsContent>

        <TabsContent value="qty-discount" className="mt-4">
          <QtyDiscountTab productId={productId} />
        </TabsContent>

        <TabsContent value="addon-price" className="mt-4">
          <AddonPricesTab productId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
