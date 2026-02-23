"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SpreadsheetEditor,
  type PriceTierChange,
} from "@/components/editors/spreadsheet-editor";
import { trpc } from "@/lib/trpc/client";

export default function PriceTiersPage() {
  const searchParams = useSearchParams();
  const initialTableId = searchParams.get("tableId");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(
    initialTableId ? Number(initialTableId) : null
  );

  const utils = trpc.useUtils();

  // Load all price tables for the selector
  const tablesQuery = trpc.priceTables.list.useQuery();
  const tables = (tablesQuery.data ?? []) as {
    id: number;
    code: string;
    name: string;
    priceType: string;
    sheetStandard: string | null;
  }[];

  // Load tiers for selected table
  const tiersQuery = trpc.priceTiers.listByTable.useQuery(
    { priceTableId: selectedTableId! },
    { enabled: selectedTableId !== null }
  );

  // REQ-C-002: Load cost data for selling price tables
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const isSelling = selectedTable?.priceType === "selling";

  // Find matching cost table (same code pattern but cost type)
  const costTable = isSelling
    ? tables.find(
        (t) =>
          t.priceType === "cost" &&
          t.sheetStandard === selectedTable?.sheetStandard &&
          t.id !== selectedTableId
      )
    : null;

  const costTiersQuery = trpc.priceTiers.listByTable.useQuery(
    { priceTableId: costTable?.id! },
    { enabled: costTable !== null && costTable !== undefined }
  );

  const batchUpsertMutation = trpc.priceTiers.batchUpsert.useMutation({
    onSuccess: () => {
      utils.priceTiers.listByTable.invalidate({
        priceTableId: selectedTableId!,
      });
      toast.success("Price tiers saved successfully");
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handleSave = (changes: PriceTierChange[]) => {
    if (!selectedTableId) return;
    batchUpsertMutation.mutate({
      priceTableId: selectedTableId,
      changes,
    });
  };

  const tierData = (tiersQuery.data ?? []).map((row) => ({
    id: (row as { id: number }).id,
    optionCode: (row as { optionCode: string }).optionCode,
    minQty: (row as { minQty: number }).minQty,
    maxQty: (row as { maxQty: number }).maxQty,
    unitPrice: (row as { unitPrice: string }).unitPrice,
    isActive: (row as { isActive: boolean }).isActive,
  }));

  const costTierData = costTiersQuery.data
    ? (costTiersQuery.data as { id: number; optionCode: string; minQty: number; maxQty: number; unitPrice: string; isActive: boolean }[]).map(
        (row) => ({
          id: row.id,
          optionCode: row.optionCode,
          minQty: row.minQty,
          maxQty: row.maxQty,
          unitPrice: row.unitPrice,
          isActive: row.isActive,
        })
      )
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Price Tier Editor
          </h1>
          <p className="text-muted-foreground">
            Edit unit prices using the spreadsheet editor
          </p>
        </div>
      </div>

      {/* Table selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Price Table:</label>
        <Select
          value={selectedTableId?.toString() ?? ""}
          onValueChange={(v) => setSelectedTableId(v ? Number(v) : null)}
        >
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Select a price table..." />
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                [{t.priceType}] {t.name} ({t.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelling && costTable && (
          <span className="text-xs text-muted-foreground">
            Cost reference: {costTable.name}
          </span>
        )}
      </div>

      {/* Spreadsheet */}
      {selectedTableId === null ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a price table to start editing tiers.
        </div>
      ) : tiersQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <SpreadsheetEditor
          priceTableId={selectedTableId}
          data={tierData}
          costData={costTierData}
          onSave={handleSave}
          isSaving={batchUpsertMutation.isPending}
        />
      )}
    </div>
  );
}
