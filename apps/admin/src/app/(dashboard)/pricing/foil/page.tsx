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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";

interface FoilPrice {
  id: number;
  foilType: string;
  foilColor: string | null;
  plateMaterial: string | null;
  targetProductType: string | null;
  width: string;
  height: string;
  sellingPrice: string;
  costPrice: string | null;
  displayOrder: number;
  isActive: boolean;
}

const formSchema = z.object({
  foilType: z.string().min(1, "Foil type is required").max(30),
  foilColor: z.string().max(30).nullable().default(null),
  plateMaterial: z.string().max(20).nullable().default(null),
  targetProductType: z.string().max(30).nullable().default(null),
  width: z.string().min(1, "Width is required"),
  height: z.string().min(1, "Height is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().nullable().default(null),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function FoilPricesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.foilPrices.list.useQuery();

  const createMutation = trpc.foilPrices.create.useMutation({
    onSuccess: () => {
      utils.foilPrices.list.invalidate();
      toast.success("Foil price created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.foilPrices.update.useMutation({
    onSuccess: () => {
      utils.foilPrices.list.invalidate();
      toast.success("Foil price updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.foilPrices.delete.useMutation({
    onSuccess: () => {
      utils.foilPrices.list.invalidate();
      toast.success("Foil price deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.foilPrices.update.useMutation({
    onSuccess: () => utils.foilPrices.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      foilType: "",
      foilColor: null,
      plateMaterial: null,
      targetProductType: null,
      width: "",
      height: "",
      sellingPrice: "",
      costPrice: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset();
    setFormOpen(true);
  };

  const handleOpenEdit = (item: FoilPrice) => {
    setEditingId(item.id);
    form.reset({
      foilType: item.foilType,
      foilColor: item.foilColor,
      plateMaterial: item.plateMaterial,
      targetProductType: item.targetProductType,
      width: item.width,
      height: item.height,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      displayOrder: item.displayOrder,
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

  const columns: ColumnDef<FoilPrice, unknown>[] = useMemo(
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
        accessorKey: "foilType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Foil Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("foilType")}</Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "foilColor",
        header: "Color",
        cell: ({ row }) => row.original.foilColor ?? "-",
      },
      {
        accessorKey: "plateMaterial",
        header: "Plate",
        cell: ({ row }) => row.original.plateMaterial ?? "-",
      },
      {
        accessorKey: "targetProductType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product Type" />
        ),
        cell: ({ row }) => {
          const t = row.original.targetProductType;
          return t ? (
            <Badge variant="secondary" className="text-xs">
              {t.replace(/_/g, " ")}
            </Badge>
          ) : (
            "-"
          );
        },
        filterFn: "arrIncludesSome",
      },
      {
        id: "dimensions",
        header: "Size (WxH)",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.width} x {row.original.height}
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
        accessorKey: "displayOrder",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order" />
        ),
        size: 70,
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

  const data = (listQuery.data ?? []) as FoilPrice[];

  const foilTypeOptions = [...new Set(data.map((d) => d.foilType))].map(
    (t) => ({ label: t, value: t })
  );
  const productTypeOptions = [
    ...new Set(
      data.map((d) => d.targetProductType).filter(Boolean) as string[]
    ),
  ].map((t) => ({ label: t.replace(/_/g, " "), value: t }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Foil / Embossing Prices
          </h1>
          <p className="text-muted-foreground">
            Manage foil stamping and embossing prices ({data.length} prices)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Foil Price
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="Search by foil type or color..."
        filters={[
          {
            columnId: "foilType",
            title: "Foil Type",
            options: foilTypeOptions,
          },
          {
            columnId: "targetProductType",
            title: "Product Type",
            options: productTypeOptions,
          },
        ]}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Edit Foil Price"
                : "Create Foil Price"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="foilType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foil Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. gold_foil" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="foilColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foil Color</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="e.g. gold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plateMaterial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plate Material</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="e.g. zinc"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetProductType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Product Type</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? null : v)
                        }
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Any</SelectItem>
                          <SelectItem value="digital_print">
                            Digital Print
                          </SelectItem>
                          <SelectItem value="offset_print">
                            Offset Print
                          </SelectItem>
                          <SelectItem value="binding">Binding</SelectItem>
                          <SelectItem value="specialty">Specialty</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 50.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 50.00" />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pt-6">
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
        title="Deactivate Foil Price"
        description="This will set the foil price as inactive. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
