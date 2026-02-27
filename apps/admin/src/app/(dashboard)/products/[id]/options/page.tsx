"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductConfigurator } from "@/components/editors/product-configurator";
import { trpc } from "@/lib/trpc/client";

interface OptionsPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductOptionsPage({ params }: OptionsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const productId = Number(id);

  const productQuery = trpc.products.getById.useQuery({ id: productId });
  const productName =
    (productQuery.data as Record<string, unknown> | undefined)?.name as
      | string
      | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/products/${productId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Options: {productName ?? "..."}
          </h1>
          <p className="text-muted-foreground">
            Assign and configure options for product #{productId}
          </p>
        </div>
      </div>

      {productQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ProductConfigurator productId={productId} />
      )}
    </div>
  );
}
