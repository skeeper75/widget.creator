"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/forms/product-form";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/lib/trpc/client";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";
  const productId = isNew ? null : Number(id);

  const utils = trpc.useUtils();

  const productQuery = trpc.products.getById.useQuery(
    { id: productId! },
    { enabled: !isNew && productId !== null }
  );

  // categories.list returns flat array
  const categoriesQuery = trpc.categories.list.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: (data) => {
      toast.success("Product created");
      utils.products.list.invalidate();
      router.push(`/products/${(data as { id: number }).id}`);
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated");
      utils.products.list.invalidate();
      utils.products.getById.invalidate({ id: productId! });
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const { confirmNavigation } = useUnsavedChanges({
    hasChanges: false,
  });

  const handleSubmit = (values: ProductFormValues) => {
    if (isNew) {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate({ id: productId!, data: values });
    }
  };

  const categories = (categoriesQuery.data ?? []).map(
    (cat: Record<string, unknown>) => ({
      id: cat.id as number,
      name: cat.name as string,
      depth: cat.depth as number,
    })
  );

  const isLoading = (!isNew && productQuery.isLoading) || categoriesQuery.isLoading;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const product = productQuery.data as Record<string, unknown> | undefined;
  const defaultValues: Partial<ProductFormValues> | undefined = product
    ? {
        categoryId: product.categoryId as number,
        huniCode: product.huniCode as string,
        edicusCode: (product.edicusCode as string | null) ?? null,
        shopbyId: (product.shopbyId as number | null) ?? null,
        name: product.name as string,
        slug: product.slug as string,
        productType: product.productType as ProductFormValues["productType"],
        pricingModel: product.pricingModel as ProductFormValues["pricingModel"],
        sheetStandard: (product.sheetStandard as ProductFormValues["sheetStandard"]) ?? null,
        figmaSection: (product.figmaSection as string | null) ?? null,
        orderMethod: product.orderMethod as ProductFormValues["orderMethod"],
        editorEnabled: product.editorEnabled as boolean,
        description: (product.description as string | null) ?? null,
        isActive: product.isActive as boolean,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirmNavigation()) router.push("/products/list");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? "New Product" : `Edit: ${(product?.name as string) ?? "..."}`}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "Create a new product"
              : `ID: ${productId} | Code: ${(product?.huniCode as string) ?? "..."}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ProductForm
              defaultValues={defaultValues}
              categories={categories}
              onSubmit={handleSubmit}
              isPending={isPending}
              isEditing={!isNew}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
