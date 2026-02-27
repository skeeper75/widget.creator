"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConstraintBuilder } from "@/components/editors/constraint-builder";
import { trpc } from "@/lib/trpc/client";

interface Product {
  id: number;
  name: string;
  huniCode: string;
}

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
}

export default function ConstraintsPage() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );

  const productsQuery = trpc.products.list.useQuery();
  const definitionsQuery = trpc.optionDefinitions.list.useQuery();

  const products = (productsQuery.data ?? []) as Product[];
  const definitions = (definitionsQuery.data ?? []) as OptionDefinition[];

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Option Constraints
          </h1>
          <p className="text-muted-foreground">
            Visual IF-THEN rule editor for option constraints
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Product:</label>
        <Select
          value={selectedProductId?.toString() ?? ""}
          onValueChange={(val) =>
            setSelectedProductId(val ? Number(val) : null)
          }
        >
          <SelectTrigger className="w-[350px]">
            <SelectValue placeholder="Select a product to manage constraints..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name} ({p.huniCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProduct && (
          <Badge variant="secondary">{selectedProduct.huniCode}</Badge>
        )}
      </div>

      {selectedProductId != null ? (
        definitionsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Constraints for {selectedProduct?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConstraintBuilder
                productId={selectedProductId}
                optionDefinitions={definitions}
              />
            </CardContent>
          </Card>
        )
      ) : (
        <div className="flex items-center justify-center h-48 rounded-md border border-dashed">
          <p className="text-muted-foreground">
            Select a product to view and manage its option constraints.
          </p>
        </div>
      )}
    </div>
  );
}
