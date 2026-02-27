"use client";

import { useState } from "react";
import { Check, Loader2, Percent, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

interface LossConfig {
  id: number;
  scopeType: string;
  scopeId: number | null;
  lossRate: string;
  minLossQty: number;
  description: string | null;
  isActive: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  category: "Category",
  product: "Product",
};

export default function LossQuantityConfigPage() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    lossRate: string;
    minLossQty: string;
  }>({ lossRate: "", minLossQty: "" });

  const utils = trpc.useUtils();
  const listQuery = trpc.lossQuantityConfigs.list.useQuery();
  const data = (listQuery.data ?? []) as LossConfig[];

  const updateMutation = trpc.lossQuantityConfigs.update.useMutation({
    onSuccess: () => {
      utils.lossQuantityConfigs.list.invalidate();
      toast.success("Loss config updated");
      setEditingId(null);
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const toggleActiveMutation = trpc.lossQuantityConfigs.update.useMutation({
    onSuccess: () => utils.lossQuantityConfigs.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const startEdit = (item: LossConfig) => {
    setEditingId(item.id);
    setEditValues({
      lossRate: item.lossRate,
      minLossQty: String(item.minLossQty),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: number) => {
    const lossRate = editValues.lossRate;
    const minLossQty = parseInt(editValues.minLossQty, 10);
    if (isNaN(minLossQty) || minLossQty < 0) {
      toast.error("Min loss qty must be a non-negative integer");
      return;
    }
    if (isNaN(parseFloat(lossRate)) || parseFloat(lossRate) < 0) {
      toast.error("Loss rate must be a non-negative number");
      return;
    }
    updateMutation.mutate({ id, data: { lossRate, minLossQty } });
  };

  // Group by scopeType
  const grouped = data.reduce<Record<string, LossConfig[]>>((acc, item) => {
    const key = item.scopeType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const scopeOrder = ["global", "category", "product"];
  const sortedGroups = scopeOrder.filter((s) => grouped[s]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Loss Quantity Config
        </h1>
        <p className="text-muted-foreground">
          Configure production loss rates by scope ({data.length} configs)
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No loss quantity configs found.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((scopeType) => (
            <div key={scopeType} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {SCOPE_LABELS[scopeType] ?? scopeType}
                </Badge>
              </h2>
              <div className="grid gap-3">
                {grouped[scopeType].map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{item.id}
                          </span>
                          {item.description ?? `${scopeType} config`}
                          {item.scopeId !== null && (
                            <Badge variant="secondary" className="text-xs">
                              ID: {item.scopeId}
                            </Badge>
                          )}
                        </CardTitle>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: item.id,
                              data: { isActive: checked },
                            })
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        {editingId === item.id ? (
                          <>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground whitespace-nowrap">
                                Loss Rate:
                              </label>
                              <div className="relative w-28">
                                <Input
                                  value={editValues.lossRate}
                                  onChange={(e) =>
                                    setEditValues((v) => ({
                                      ...v,
                                      lossRate: e.target.value,
                                    }))
                                  }
                                  className="pr-7 h-8 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(item.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  autoFocus
                                />
                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground whitespace-nowrap">
                                Min Loss Qty:
                              </label>
                              <Input
                                type="number"
                                value={editValues.minLossQty}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    minLossQty: e.target.value,
                                  }))
                                }
                                className="w-24 h-8 text-sm"
                                min={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(item.id);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => saveEdit(item.id)}
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={cancelEdit}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="flex items-center gap-4 flex-1 cursor-pointer rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors"
                              onClick={() => startEdit(item)}
                            >
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  Loss Rate:{" "}
                                </span>
                                <span className="font-mono font-medium">
                                  {item.lossRate}%
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  Min Loss Qty:{" "}
                                </span>
                                <span className="font-mono font-medium">
                                  {item.minLossQty}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
