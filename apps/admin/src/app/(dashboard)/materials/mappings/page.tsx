"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MatrixEditor,
  type Paper,
  type Product,
  type Category,
  type PaperProductMapping,
} from "@/components/editors/matrix-editor";
import { trpc } from "@/lib/trpc/client";

export default function MappingsPage() {
  const [coverType, setCoverType] = useState<"body" | "cover">("body");

  const utils = trpc.useUtils();

  // paperProductMappings.getMatrix returns { papers, products, mappings }
  const matrixQuery = trpc.paperProductMappings.getMatrix.useQuery({
    coverType,
  });

  // categories.list returns flat array for grouping products by category
  const categoriesQuery = trpc.categories.list.useQuery();

  const toggleMutation = trpc.paperProductMappings.toggle.useMutation({
    onSuccess: () => {
      utils.paperProductMappings.getMatrix.invalidate({ coverType });
    },
    onError: (err) => {
      toast.error(`Failed to toggle: ${err.message}`);
    },
  });

  const papers: Paper[] = useMemo(
    () =>
      (matrixQuery.data?.papers ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as number,
        code: p.code as string,
        name: p.name as string,
        weight: p.weight as number | null,
      })),
    [matrixQuery.data?.papers]
  );

  const products: Product[] = useMemo(
    () =>
      (matrixQuery.data?.products ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as number,
        name: p.name as string,
        categoryId: p.categoryId as number,
      })),
    [matrixQuery.data?.products]
  );

  const categories: Category[] = useMemo(
    () =>
      (categoriesQuery.data ?? []).map(
        (c: Record<string, unknown>) => ({
          id: c.id as number,
          name: c.name as string,
        })
      ),
    [categoriesQuery.data]
  );

  const mappings: PaperProductMapping[] = useMemo(
    () =>
      (matrixQuery.data?.mappings ?? []).map(
        (m: Record<string, unknown>, index: number) => ({
          id: (m.id as number) ?? index,
          paperId: m.paperId as number,
          productId: m.productId as number,
          coverType: m.coverType as string,
          isActive: m.isActive as boolean,
        })
      ),
    [matrixQuery.data?.mappings]
  );

  const handleToggle = useCallback(
    (paperId: number, productId: number, active: boolean) => {
      toggleMutation.mutate({
        paperId,
        productId,
        coverType,
        active,
      });
    },
    [coverType, toggleMutation]
  );

  const isLoading = matrixQuery.isLoading || categoriesQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Paper-Product Mappings
        </h1>
        <p className="text-muted-foreground">
          Map papers to products using the matrix grid. Click cells to toggle
          mappings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapping Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <MatrixEditor
              rows={papers}
              columns={products}
              categories={categories}
              mappings={mappings}
              coverType={coverType}
              onCoverTypeChange={setCoverType}
              onToggle={handleToggle}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
