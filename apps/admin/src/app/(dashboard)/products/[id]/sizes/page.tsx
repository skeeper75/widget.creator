"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { trpc } from "@/lib/trpc/client";

interface ProductSize {
  id: number;
  productId: number;
  code: string;
  displayName: string;
  cutWidth: string | null;
  cutHeight: string | null;
  workWidth: string | null;
  workHeight: string | null;
  bleed: string | null;
  impositionCount: number | null;
  sheetStandard: string | null;
  displayOrder: number;
  isCustom: boolean;
  customMinW: string | null;
  customMinH: string | null;
  customMaxW: string | null;
  customMaxH: string | null;
  isActive: boolean;
}

interface SizesPageProps {
  params: Promise<{ id: string }>;
}

export default function SizesPage({ params }: SizesPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const productId = Number(id);
  const [editedRows, setEditedRows] = useState<Map<number, Partial<ProductSize>>>(
    new Map()
  );

  const utils = trpc.useUtils();

  const productQuery = trpc.products.getById.useQuery({ id: productId });

  // productSizes.listByProduct returns flat array for this product
  const sizesQuery = trpc.productSizes.listByProduct.useQuery({
    productId,
  });

  const updateMutation = trpc.productSizes.update.useMutation({
    onSuccess: () => {
      utils.productSizes.listByProduct.invalidate({ productId });
    },
  });

  // batchUpdate takes array of { id, data }
  const batchUpdateMutation = trpc.productSizes.batchUpdate.useMutation({
    onSuccess: () => {
      utils.productSizes.listByProduct.invalidate({ productId });
      setEditedRows(new Map());
      toast.success("Sizes updated");
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // Hard delete
  const deleteMutation = trpc.productSizes.delete.useMutation({
    onSuccess: () => {
      utils.productSizes.listByProduct.invalidate({ productId });
      toast.success("Size deleted");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  // listByProduct returns flat array directly
  const sizes = (sizesQuery.data ?? []) as ProductSize[];

  const handleCellEdit = (
    rowId: number,
    field: keyof ProductSize,
    value: unknown
  ) => {
    setEditedRows((prev) => {
      const next = new Map(prev);
      const existing = next.get(rowId) ?? {};
      next.set(rowId, { ...existing, [field]: value });
      return next;
    });
  };

  const handleSaveAll = () => {
    if (editedRows.size === 0) return;

    // batchUpdate takes array of { id, data }
    const items = Array.from(editedRows.entries()).map(([sizeId, data]) => ({
      id: sizeId,
      data,
    }));

    batchUpdateMutation.mutate(items);
  };

  const columns: ColumnDef<ProductSize, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("code")}</span>
        ),
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const size = row.original;
          const edited = editedRows.get(size.id);
          return (
            <Input
              className="h-8 text-sm"
              defaultValue={
                (edited?.displayName as string) ?? size.displayName
              }
              onBlur={(e) =>
                handleCellEdit(size.id, "displayName", e.target.value)
              }
            />
          );
        },
      },
      {
        accessorKey: "cutWidth",
        header: "Cut W",
        cell: ({ row }) => {
          const size = row.original;
          return (
            <Input
              type="number"
              className="h-8 w-20 text-sm"
              defaultValue={size.cutWidth ?? ""}
              onBlur={(e) =>
                handleCellEdit(
                  size.id,
                  "cutWidth",
                  e.target.value || null
                )
              }
            />
          );
        },
        size: 80,
      },
      {
        accessorKey: "cutHeight",
        header: "Cut H",
        cell: ({ row }) => {
          const size = row.original;
          return (
            <Input
              type="number"
              className="h-8 w-20 text-sm"
              defaultValue={size.cutHeight ?? ""}
              onBlur={(e) =>
                handleCellEdit(
                  size.id,
                  "cutHeight",
                  e.target.value || null
                )
              }
            />
          );
        },
        size: 80,
      },
      {
        accessorKey: "workWidth",
        header: "Work W",
        cell: ({ row }) => {
          const size = row.original;
          return (
            <Input
              type="number"
              className="h-8 w-20 text-sm"
              defaultValue={size.workWidth ?? ""}
              onBlur={(e) =>
                handleCellEdit(
                  size.id,
                  "workWidth",
                  e.target.value || null
                )
              }
            />
          );
        },
        size: 80,
      },
      {
        accessorKey: "workHeight",
        header: "Work H",
        cell: ({ row }) => {
          const size = row.original;
          return (
            <Input
              type="number"
              className="h-8 w-20 text-sm"
              defaultValue={size.workHeight ?? ""}
              onBlur={(e) =>
                handleCellEdit(
                  size.id,
                  "workHeight",
                  e.target.value || null
                )
              }
            />
          );
        },
        size: 80,
      },
      {
        accessorKey: "bleed",
        header: "Bleed",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.bleed ?? "-"}</span>
        ),
        size: 60,
      },
      {
        accessorKey: "isCustom",
        header: "Custom",
        cell: ({ row }) => {
          const size = row.original;
          return size.isCustom ? (
            <Badge variant="secondary" className="text-xs">
              Custom
            </Badge>
          ) : null;
        },
        size: 70,
      },
      {
        id: "customRange",
        header: "Custom Range",
        cell: ({ row }) => {
          const size = row.original;
          if (!size.isCustom) return null;
          return (
            <div className="flex gap-1 text-xs">
              <span>
                W: {size.customMinW}-{size.customMaxW}
              </span>
              <span>
                H: {size.customMinH}-{size.customMaxH}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          const size = row.original;
          return (
            <Switch
              checked={size.isActive}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  id: size.id,
                  data: { isActive: checked },
                })
              }
            />
          );
        },
        size: 70,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate({ id: row.original.id })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        size: 50,
      },
    ],
    [editedRows, updateMutation, deleteMutation]
  );

  const productName =
    (productQuery.data as Record<string, unknown> | undefined)?.name as string | undefined;

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
            Sizes: {productName ?? "..."}
          </h1>
          <p className="text-muted-foreground">
            Manage sizes for product #{productId} ({sizes.length} sizes)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Product Sizes</CardTitle>
          <div className="flex gap-2">
            {editedRows.size > 0 && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={batchUpdateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes ({editedRows.size})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Size
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sizesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={sizes}
              searchPlaceholder="Search sizes..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
