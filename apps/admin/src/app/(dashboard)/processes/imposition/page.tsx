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

interface ImpositionRule {
  id: number;
  cutSizeCode: string;
  cutWidth: string;
  cutHeight: string;
  workWidth: string;
  workHeight: string;
  impositionCount: number;
  sheetStandard: string;
  description: string | null;
  isActive: boolean;
}

const formSchema = z.object({
  cutSizeCode: z.string().min(1, "Cut size code is required").max(30),
  cutWidth: z.string().min(1, "Cut width is required"),
  cutHeight: z.string().min(1, "Cut height is required"),
  workWidth: z.string().min(1, "Work width is required"),
  workHeight: z.string().min(1, "Work height is required"),
  impositionCount: z.coerce.number().int().positive("Must be positive"),
  sheetStandard: z.string().min(1, "Sheet standard is required").max(5),
  description: z.string().max(200).nullable().default(null),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function ImpositionPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.impositionRules.list.useQuery();

  const createMutation = trpc.impositionRules.create.useMutation({
    onSuccess: () => {
      utils.impositionRules.list.invalidate();
      toast.success("Imposition rule created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.impositionRules.update.useMutation({
    onSuccess: () => {
      utils.impositionRules.list.invalidate();
      toast.success("Imposition rule updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.impositionRules.delete.useMutation({
    onSuccess: () => {
      utils.impositionRules.list.invalidate();
      toast.success("Imposition rule deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.impositionRules.update.useMutation({
    onSuccess: () => utils.impositionRules.list.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cutSizeCode: "",
      cutWidth: "",
      cutHeight: "",
      workWidth: "",
      workHeight: "",
      impositionCount: 1,
      sheetStandard: "",
      description: null,
      isActive: true,
    },
  });

  // REQ-E-304: Real-time uniqueness check for cutWidth x cutHeight within sheetStandard
  const watchCutWidth = form.watch("cutWidth");
  const watchCutHeight = form.watch("cutHeight");
  const watchSheetStandard = form.watch("sheetStandard");

  const checkDuplicate = useMemo(() => {
    const data = (listQuery.data ?? []) as ImpositionRule[];
    if (!watchCutWidth || !watchCutHeight || !watchSheetStandard) {
      return null;
    }
    const duplicate = data.find(
      (d) =>
        d.cutWidth === watchCutWidth &&
        d.cutHeight === watchCutHeight &&
        d.sheetStandard === watchSheetStandard &&
        d.id !== editingId
    );
    return duplicate
      ? `Duplicate: ${watchCutWidth}x${watchCutHeight} already exists for ${watchSheetStandard} (ID: ${duplicate.id})`
      : null;
  }, [watchCutWidth, watchCutHeight, watchSheetStandard, listQuery.data, editingId]);

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({
      cutSizeCode: "",
      cutWidth: "",
      cutHeight: "",
      workWidth: "",
      workHeight: "",
      impositionCount: 1,
      sheetStandard: "",
      description: null,
      isActive: true,
    });
    setDuplicateWarning(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: ImpositionRule) => {
    setEditingId(item.id);
    form.reset({
      cutSizeCode: item.cutSizeCode,
      cutWidth: item.cutWidth,
      cutHeight: item.cutHeight,
      workWidth: item.workWidth,
      workHeight: item.workHeight,
      impositionCount: item.impositionCount,
      sheetStandard: item.sheetStandard,
      description: item.description,
      isActive: item.isActive,
    });
    setDuplicateWarning(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDuplicateWarning(null);
    form.reset();
  };

  const onSubmit = (values: FormValues) => {
    if (checkDuplicate) {
      setDuplicateWarning(checkDuplicate);
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: ColumnDef<ImpositionRule, unknown>[] = useMemo(
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
        accessorKey: "cutSizeCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cut Size Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.getValue("cutSizeCode")}
          </span>
        ),
      },
      {
        id: "cutSize",
        header: "Cut Size (WxH)",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.cutWidth} x {row.original.cutHeight}
          </span>
        ),
      },
      {
        id: "workSize",
        header: "Work Size (WxH)",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.workWidth} x {row.original.workHeight}
          </span>
        ),
      },
      {
        accessorKey: "impositionCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Count" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.getValue("impositionCount")}
          </Badge>
        ),
        size: 80,
      },
      {
        accessorKey: "sheetStandard",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sheet" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("sheetStandard")}</Badge>
        ),
        filterFn: "arrIncludesSome",
        size: 80,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span
            className="max-w-[200px] truncate block text-muted-foreground text-xs"
            title={row.original.description ?? undefined}
          >
            {row.original.description ?? "-"}
          </span>
        ),
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

  const data = (listQuery.data ?? []) as ImpositionRule[];

  const sheetOptions = [...new Set(data.map((d) => d.sheetStandard))].map(
    (s) => ({ label: s, value: s })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Imposition Rules
          </h1>
          <p className="text-muted-foreground">
            Manage sheet imposition calculation rules ({data.length} rules)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="Search by cut size code..."
        filters={[
          {
            columnId: "sheetStandard",
            title: "Sheet Standard",
            options: sheetOptions,
          },
        ]}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Edit Imposition Rule"
                : "Create Imposition Rule"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cutSizeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cut Size Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. A4" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sheetStandard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sheet Standard</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A3">A3</SelectItem>
                          <SelectItem value="T3">T3</SelectItem>
                          <SelectItem value="A4">A4</SelectItem>
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
                  name="cutWidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cut Width (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 210.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cutHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cut Height (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 297.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* REQ-E-304: Real-time uniqueness validation */}
              {(checkDuplicate || duplicateWarning) && (
                <p className="text-sm text-destructive">
                  {checkDuplicate ?? duplicateWarning}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workWidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Width (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 216.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Height (mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 303.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="impositionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imposition Count</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                        placeholder="Optional description"
                      />
                    </FormControl>
                    <FormMessage />
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
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !!checkDuplicate
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
        title="Deactivate Imposition Rule"
        description="This will set the imposition rule as inactive. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
