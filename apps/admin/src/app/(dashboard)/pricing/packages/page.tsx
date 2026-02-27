"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";

interface PackagePrice {
  id: number;
  productId: number;
  sizeId: number;
  printModeId: number;
  pageCount: number;
  minQty: number;
  maxQty: number;
  sellingPrice: string;
  costPrice: string | null;
  isActive: boolean;
}

const formSchema = z.object({
  productId: z.coerce.number().int().positive("Product ID is required"),
  sizeId: z.coerce.number().int().positive("Size ID is required"),
  printModeId: z.coerce.number().int().positive("Print mode ID is required"),
  pageCount: z.coerce.number().int().positive("Page count must be positive"),
  minQty: z.coerce.number().int().positive("Min qty must be positive"),
  maxQty: z.coerce.number().int().positive("Max qty must be positive"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().nullable().default(null),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function PackagePricesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.packagePrices.list.useQuery();

  const createMutation = trpc.packagePrices.create.useMutation({
    onSuccess: () => {
      utils.packagePrices.list.invalidate();
      toast.success("Package price created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.packagePrices.update.useMutation({
    onSuccess: () => {
      utils.packagePrices.list.invalidate();
      toast.success("Package price updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.packagePrices.delete.useMutation({
    onSuccess: () => {
      utils.packagePrices.list.invalidate();
      toast.success("Package price deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.packagePrices.update.useMutation({
    onSuccess: () => utils.packagePrices.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: 0,
      sizeId: 0,
      printModeId: 0,
      pageCount: 4,
      minQty: 1,
      maxQty: 999999,
      sellingPrice: "",
      costPrice: null,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset();
    setFormOpen(true);
  };

  const handleOpenEdit = (item: PackagePrice) => {
    setEditingId(item.id);
    form.reset({
      productId: item.productId,
      sizeId: item.sizeId,
      printModeId: item.printModeId,
      pageCount: item.pageCount,
      minQty: item.minQty,
      maxQty: item.maxQty,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingId(null);
    form.reset();
  };

  const onSubmit = (values: FormValues) => {
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: ColumnDef<PackagePrice, unknown>[] = useMemo(
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
        accessorKey: "productId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.getValue("productId")}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "sizeId",
        header: "Size",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("sizeId")}</span>
        ),
        size: 60,
      },
      {
        accessorKey: "printModeId",
        header: "Print Mode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.getValue("printModeId")}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "pageCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pages" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("pageCount")}p</Badge>
        ),
        size: 70,
      },
      {
        id: "qtyRange",
        header: "Qty Range",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.minQty.toLocaleString()} -{" "}
            {row.original.maxQty.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Selling" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-right block">
            {Number(row.getValue("sellingPrice")).toLocaleString()}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "costPrice",
        header: "Cost",
        cell: ({ row }) => {
          const cost = row.original.costPrice;
          return (
            <span className="font-mono text-xs text-right block text-muted-foreground">
              {cost ? Number(cost).toLocaleString() : "-"}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Switch
              checked={item.isActive}
              onCheckedChange={(checked) =>
                toggleActiveMutation.mutate({
                  id: item.id,
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
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteId(item.id)}
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
    [toggleActiveMutation]
  );

  const data = (listQuery.data ?? []) as PackagePrice[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Package Prices
          </h1>
          <p className="text-muted-foreground">
            Manage package-based pricing for booklets ({data.length} prices)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package Price
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="Search..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Edit Package Price"
                : "Create Package Price"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product ID</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sizeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size ID</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="printModeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Print Mode ID</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Count</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Qty</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Qty</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingId !== null
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Deactivate Package Price"
        description="This will set the package price as inactive. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
