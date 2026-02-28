"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceConfigTabs } from "@/components/widget-builder/price-config-tabs";
import { trpc } from "@/lib/trpc/client";

// ─── Price mode display ───────────────────────────────────────────────────────

const PRICE_MODE_OPTIONS = [
  { value: "LOOKUP", label: "LOOKUP — Table lookup by qty/type" },
  { value: "AREA", label: "AREA — Price per square meter" },
  { value: "PAGE", label: "PAGE — Price per page with imposition" },
  { value: "COMPOSITE", label: "COMPOSITE — Formula-based calculation" },
] as const;

const PRICE_MODE_BADGE_COLORS: Record<string, string> = {
  LOOKUP: "bg-blue-100 text-blue-800",
  AREA: "bg-green-100 text-green-800",
  PAGE: "bg-purple-100 text-purple-800",
  COMPOSITE: "bg-amber-100 text-amber-800",
};

// @MX:NOTE: [AUTO] PricingPage — product price configuration admin page (SPEC-WIDGET-ADMIN-001 Phase 4)
export default function PricingPage() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [pendingPriceMode, setPendingPriceMode] = useState<string | null>(null);

  // Use widgetAdmin dashboard query which returns wbProducts list
  const productsQuery = trpc.widgetAdmin.dashboard.useQuery();

  const priceConfigQuery = trpc.pricing.getPriceConfig.useQuery(
    { productId: selectedProductId! },
    { enabled: selectedProductId !== null },
  );

  const upsertPriceConfigMutation = trpc.pricing.upsertPriceConfig.useMutation({
    onSuccess: () => {
      priceConfigQuery.refetch();
      toast.success("Price configuration saved");
      setPendingPriceMode(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const products = productsQuery.data ?? [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const priceConfig = priceConfigQuery.data;

  const currentPriceMode = pendingPriceMode ?? priceConfig?.priceMode ?? null;

  const handleSaveConfig = () => {
    if (!selectedProductId || !currentPriceMode) return;

    upsertPriceConfigMutation.mutate({
      productId: selectedProductId,
      priceMode: currentPriceMode as "LOOKUP" | "AREA" | "PAGE" | "COMPOSITE",
      formulaText: priceConfig?.formulaText ?? null,
      unitPriceSqm: priceConfig?.unitPriceSqm?.toString() ?? null,
      minAreaSqm: priceConfig?.minAreaSqm?.toString() ?? null,
      imposition: priceConfig?.imposition ?? null,
      coverPrice: priceConfig?.coverPrice?.toString() ?? null,
      bindingCost: priceConfig?.bindingCost?.toString() ?? null,
      baseCost: priceConfig?.baseCost?.toString() ?? null,
      isActive: priceConfig?.isActive ?? true,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Price Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure pricing tables and modes for each product
          </p>
        </div>
      </div>

      {/* Product selector + price mode */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Product
          </label>
          <Select
            value={selectedProductId?.toString() ?? ""}
            onValueChange={(val) => {
              setSelectedProductId(Number(val));
              setPendingPriceMode(null);
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.productNameKo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProductId !== null && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Price Mode
            </label>
            <div className="flex items-center gap-2">
              {priceConfigQuery.isLoading ? (
                <span className="text-sm text-muted-foreground">Loading...</span>
              ) : (
                <>
                  <Select
                    value={currentPriceMode ?? ""}
                    onValueChange={(val) => setPendingPriceMode(val)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select price mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_MODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentPriceMode && (
                    <Badge
                      variant="outline"
                      className={PRICE_MODE_BADGE_COLORS[currentPriceMode] ?? ""}
                    >
                      {currentPriceMode}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {selectedProductId !== null && currentPriceMode && (
          <div className="flex items-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={handleSaveConfig}
              disabled={upsertPriceConfigMutation.isPending}
            >
              <Settings className="h-3.5 w-3.5" />
              Save Config
            </Button>
          </div>
        )}
      </div>

      {/* Price configuration tabs */}
      {selectedProductId !== null && selectedProduct ? (
        <div className="border rounded-lg p-4">
          <PriceConfigTabs
            productId={selectedProductId}
            productName={selectedProduct.productNameKo}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/10">
          <div className="text-center text-sm text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Select a product to configure pricing tables</p>
          </div>
        </div>
      )}
    </div>
  );
}
