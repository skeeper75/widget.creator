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

interface FixedPrice {
  id: number;
  productId: number;
  sizeId: number | null;
  paperId: number | null;
  materialId: number | null;
  printModeId: number | null;
  optionLabel: string | null;
  baseQty: number;
  sellingPrice: string;
  costPrice: string | null;
  vatIncluded: boolean;
  isActive: boolean;
}

const formSchema = z.object({
  productId: z.coerce.number().int().positive("Product ID is required"),
  sizeId: z.coerce.number().int().positive().nullable().default(null),
  paperId: z.coerce.number().int().positive().nullable().default(null),
  materialId: z.coerce.number().int().positive().nullable().default(null),
  printModeId: z.coerce.number().int().positive().nullable().default(null),
  optionLabel: z.string().max(100).nullable().default(null),
  baseQty: z.coerce.number().int().positive().default(1),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().nullable().default(null),
  vatIncluded: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function FixedPricesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.fixedPrices.list.useQuery();

  const createMutation = trpc.fixedPrices.create.useMutation({
    onSuccess: () => {
      utils.fixedPrices.list.invalidate();
      toast.success("Fixed price created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.fixedPrices.update.useMutation({
    onSuccess: () => {
      utils.fixedPrices.list.invalidate();
      toast.success("Fixed price updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.fixedPrices.delete.useMutation({
    onSuccess: () => {
      utils.fixedPrices.list.invalidate();
      toast.success("Fixed price deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.fixedPrices.update.useMutation({
    onSuccess: () => utils.fixedPrices.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: 0,
      sizeId: null,
      paperId: null,
      materialId: null,
      printModeId: null,
      optionLabel: null,
      baseQty: 1,
      sellingPrice: "",
      costPrice: null,
      vatIncluded: false,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset();
    setFormOpen(true);
  };

  const handleOpenEdit = (item: FixedPrice) => {
    setEditingId(item.id);
    form.reset({
      productId: item.productId,
      sizeId: item.sizeId,
      paperId: item.paperId,
      materialId: item.materialId,
      printModeId: item.printModeId,
      optionLabel: item.optionLabel,
      baseQty: item.baseQty,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      vatIncluded: item.vatIncluded,
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

  const columns: ColumnDef<FixedPrice, unknown>[] = useMemo(
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
          <DataTableColumnHeader column={column} title="Product ID" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.getValue("productId")}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "sizeId",
        header: "Size ID",
        cell: ({ row }) => row.original.sizeId ?? "-",
        size: 70,
      },
      {
        accessorKey: "paperId",
        header: "Paper ID",
        cell: ({ row }) => row.original.paperId ?? "-",
        size: 70,
      },
      {
        accessorKey: "printModeId",
        header: "PrintMode ID",
        cell: ({ row }) => row.original.printModeId ?? "-",
        size: 90,
      },
      {
        accessorKey: "optionLabel",
        header: "Option Label",
        cell: ({ row }) => row.original.optionLabel ?? "-",
      },
      {
        accessorKey: "baseQty",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Base Qty" />
        ),
        size: 80,
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cost" />
        ),
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
        accessorKey: "vatIncluded",
        header: "VAT",
        cell: ({ row }) =>
          row.original.vatIncluded ? (
            <Badge variant="secondary" className="text-xs">VAT</Badge>
          ) : (
            "-"
          ),
        size: 60,
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

  const data = (listQuery.data ?? []) as FixedPrice[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fixed Prices</h1>
          <p className="text-muted-foreground">
            Manage fixed unit prices for specific product configurations (
            {data.length} prices)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Fixed Price
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="Search by option label..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Edit Fixed Price"
                : "Create Fixed Price"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  name="optionLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Label</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="sizeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paperId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="materialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
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
                      <FormLabel>Print Mode</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="baseQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Qty</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <div className="flex items-center gap-6">
                <FormField
                  control={form.control}
                  name="vatIncluded"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">VAT Included</FormLabel>
                    </FormItem>
                  )}
                />
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
              </div>
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
        title="Deactivate Fixed Price"
        description="This will set the fixed price as inactive. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
