"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Check,
  X,
  MoreHorizontal,
  Pencil,
  Ruler,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";

interface Product {
  id: number;
  categoryId: number;
  categoryName: string | null;
  huniCode: string;
  edicusCode: string | null;
  shopbyId: number | null;
  name: string;
  slug: string;
  productType: string;
  pricingModel: string;
  sheetStandard: string | null;
  orderMethod: string;
  editorEnabled: boolean;
  mesRegistered: boolean;
  isActive: boolean;
}

const orderMethodBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  upload: "default",
  editor: "secondary",
  delivery: "outline",
};

export default function ProductListPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // products.list returns { data, total, page, pageSize }
  const productsQuery = trpc.products.list.useQuery({});

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Product deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const columns: ColumnDef<Product, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("id")}</span>
        ),
        size: 60,
      },
      {
        accessorKey: "huniCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Huni Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("huniCode")}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium max-w-[200px] truncate block">
            {row.getValue("name")}
          </span>
        ),
      },
      {
        accessorKey: "categoryName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => row.getValue("categoryName") ?? "-",
      },
      {
        accessorKey: "productType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {(row.getValue("productType") as string).replace(/_/g, " ")}
          </Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "pricingModel",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pricing Model" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {(row.getValue("pricingModel") as string).replace(/_/g, " ")}
          </Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "orderMethod",
        header: "Order Method",
        cell: ({ row }) => {
          const method = row.getValue("orderMethod") as string;
          return (
            <Badge variant={orderMethodBadgeVariant[method] ?? "outline"}>
              {method}
            </Badge>
          );
        },
      },
      {
        accessorKey: "editorEnabled",
        header: "Editor",
        cell: ({ row }) =>
          row.getValue("editorEnabled") ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          ),
        size: 70,
      },
      {
        accessorKey: "mesRegistered",
        header: "MES",
        cell: ({ row }) =>
          row.getValue("mesRegistered") ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          ),
        size: 70,
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) =>
          row.getValue("isActive") ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
        size: 80,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/products/${product.id}/sizes`)
                  }
                >
                  <Ruler className="mr-2 h-4 w-4" />
                  View Sizes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/products/${product.id}/options`)
                  }
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  View Options
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteId(product.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 50,
      },
    ],
    [router]
  );

  const products = (productsQuery.data?.data ?? []) as Product[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage product catalog ({productsQuery.data?.total ?? 0} products)
          </p>
        </div>
        <Button onClick={() => router.push("/products/new")}>
          Add Product
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={productsQuery.isLoading}
        searchPlaceholder="Search by name or code..."
        filters={[
          {
            columnId: "productType",
            title: "Product Type",
            options: [
              { label: "Digital Print", value: "digital_print" },
              { label: "Offset Print", value: "offset_print" },
              { label: "Large Format", value: "large_format" },
              { label: "Cutting", value: "cutting" },
              { label: "Binding", value: "binding" },
              { label: "Specialty", value: "specialty" },
            ],
          },
          {
            columnId: "pricingModel",
            title: "Pricing Model",
            options: [
              { label: "Tiered", value: "tiered" },
              { label: "Fixed", value: "fixed" },
              { label: "Package", value: "package" },
              { label: "Size Dependent", value: "size_dependent" },
            ],
          },
        ]}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the product as inactive. It will no longer appear in
              the widget builder. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId !== null && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
