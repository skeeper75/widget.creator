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

interface Binding {
  id: number;
  code: string;
  name: string;
  minPages: number | null;
  maxPages: number | null;
  pageStep: number | null;
  displayOrder: number;
  isActive: boolean;
}

// REQ-E-303: minPages < maxPages, pageStep > 0
const formSchema = z
  .object({
    code: z.string().min(1, "Code is required").max(50),
    name: z.string().min(1, "Name is required").max(50),
    minPages: z.coerce.number().int().positive().nullable().default(null),
    maxPages: z.coerce.number().int().positive().nullable().default(null),
    pageStep: z.coerce.number().int().positive().nullable().default(null),
    displayOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.minPages != null && data.maxPages != null) {
        return data.minPages < data.maxPages;
      }
      return true;
    },
    { message: "minPages must be less than maxPages", path: ["maxPages"] }
  )
  .refine(
    (data) => {
      if (data.pageStep != null) {
        return data.pageStep > 0;
      }
      return true;
    },
    { message: "pageStep must be greater than 0", path: ["pageStep"] }
  );

type FormValues = z.infer<typeof formSchema>;

export default function BindingsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.bindings.list.useQuery();

  const createMutation = trpc.bindings.create.useMutation({
    onSuccess: () => {
      utils.bindings.list.invalidate();
      toast.success("Binding created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.bindings.update.useMutation({
    onSuccess: () => {
      utils.bindings.list.invalidate();
      toast.success("Binding updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.bindings.delete.useMutation({
    onSuccess: () => {
      utils.bindings.list.invalidate();
      toast.success("Binding deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.bindings.update.useMutation({
    onSuccess: () => utils.bindings.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      minPages: null,
      maxPages: null,
      pageStep: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({
      code: "",
      name: "",
      minPages: null,
      maxPages: null,
      pageStep: null,
      displayOrder: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: Binding) => {
    setEditingId(item.id);
    form.reset({
      code: item.code,
      name: item.name,
      minPages: item.minPages,
      maxPages: item.maxPages,
      pageStep: item.pageStep,
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

  const columns: ColumnDef<Binding, unknown>[] = useMemo(
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
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("code")}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "minPages",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Min Pages" />
        ),
        cell: ({ row }) => row.original.minPages ?? "-",
        size: 90,
      },
      {
        accessorKey: "maxPages",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Max Pages" />
        ),
        cell: ({ row }) => row.original.maxPages ?? "-",
        size: 90,
      },
      {
        accessorKey: "pageStep",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Page Step" />
        ),
        cell: ({ row }) => row.original.pageStep ?? "-",
        size: 90,
      },
      {
        id: "pageRange",
        header: "Page Range",
        cell: ({ row }) => {
          const { minPages, maxPages, pageStep } = row.original;
          if (minPages == null || maxPages == null) return "-";
          return (
            <Badge variant="outline" className="text-xs">
              {minPages}-{maxPages}
              {pageStep ? ` (step: ${pageStep})` : ""}
            </Badge>
          );
        },
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

  const data = (listQuery.data ?? []) as Binding[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bindings</h1>
          <p className="text-muted-foreground">
            Manage binding types and page constraints ({data.length} bindings)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Binding
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="Search by name or code..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Edit Binding" : "Create Binding"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. SADDLE_STITCH" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Saddle Stitch Binding"
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
                  name="minPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Pages</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
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
                  name="maxPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Pages</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
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
                  name="pageStep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Step</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Deactivate Binding"
        description="This will set the binding as inactive. It will no longer be available for selection. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
