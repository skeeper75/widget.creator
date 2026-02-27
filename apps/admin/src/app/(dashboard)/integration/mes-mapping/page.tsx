"use client";

import { toast } from "sonner";
import {
  VisualMapper,
  type MapperProduct,
  type MapperMesItem,
  type MapperMapping,
} from "@/components/editors/visual-mapper";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { trpc } from "@/lib/trpc/client";

/**
 * MES Mapping page - Visual two-panel mapper for product-to-MES connections.
 * REQ-E-602: VisualMapper with SVG connection lines.
 */
export default function MesMappingPage() {
  const utils = trpc.useUtils();
  const mapperQuery = trpc.productMesMappings.getMapperData.useQuery();

  const createMutation = trpc.productMesMappings.create.useMutation({
    onSuccess: () => {
      utils.productMesMappings.getMapperData.invalidate();
      toast.success("Mapping created");
    },
    onError: (err) => {
      toast.error(`Failed to create mapping: ${err.message}`);
    },
  });

  const deleteMutation = trpc.productMesMappings.delete.useMutation({
    onSuccess: () => {
      utils.productMesMappings.getMapperData.invalidate();
      toast.success("Mapping deleted");
    },
    onError: (err) => {
      toast.error(`Failed to delete mapping: ${err.message}`);
    },
  });

  if (mapperQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Product-MES Mapping
          </h1>
          <p className="text-muted-foreground">
            Visual mapping editor for product-to-MES connections
          </p>
        </div>
        <LoadingSkeleton variant="card" rows={2} />
      </div>
    );
  }

  const data = mapperQuery.data;
  const products = (data?.products ?? []) as MapperProduct[];
  const mesItemsList = (data?.mesItems ?? []) as MapperMesItem[];
  const mappingsList = (data?.mappings ?? []) as MapperMapping[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Product-MES Mapping
        </h1>
        <p className="text-muted-foreground">
          Visual mapping editor — Click a product, then click a MES item to
          create a mapping. Click a line to delete it.
        </p>
      </div>

      <VisualMapper
        products={products}
        mesItems={mesItemsList}
        mappings={mappingsList}
        onCreateMapping={(productId, mesItemId) =>
          createMutation.mutate({ productId, mesItemId })
        }
        onDeleteMapping={(mappingId) => deleteMutation.mutate({ id: mappingId })}
        isLoading={createMutation.isPending || deleteMutation.isPending}
      />
    </div>
  );
}
