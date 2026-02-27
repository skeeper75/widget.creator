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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";

interface PostProcess {
  id: number;
  groupCode: string;
  code: string;
  name: string;
  processType: string;
  subOptionCode: number | null;
  subOptionName: string | null;
  priceBasis: string;
  sheetStandard: string | null;
  displayOrder: number;
  isActive: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  foil: "Foil Stamping",
  emboss: "Embossing",
  coating: "Coating",
  folding: "Folding",
  perforation: "Perforation",
  scoring: "Scoring",
  microperf: "Micro-perforation",
  packaging: "Packaging",
};

const formSchema = z.object({
  groupCode: z.string().min(1, "Group is required").max(20),
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Name is required").max(100),
  processType: z.string().min(1, "Process type is required").max(30),
  subOptionCode: z.coerce.number().int().nullable().default(null),
  subOptionName: z.string().max(50).nullable().default(null),
  priceBasis: z.string().default("per_unit"),
  sheetStandard: z.string().max(5).nullable().default(null),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function PostProcessesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const groupedQuery = trpc.postProcesses.listGrouped.useQuery();

  const createMutation = trpc.postProcesses.create.useMutation({
    onSuccess: () => {
      utils.postProcesses.listGrouped.invalidate();
      toast.success("Post process created");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to create: ${err.message}`),
  });

  const updateMutation = trpc.postProcesses.update.useMutation({
    onSuccess: () => {
      utils.postProcesses.listGrouped.invalidate();
      toast.success("Post process updated");
      handleCloseForm();
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  const deleteMutation = trpc.postProcesses.delete.useMutation({
    onSuccess: () => {
      utils.postProcesses.listGrouped.invalidate();
      toast.success("Post process deactivated");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to deactivate: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.postProcesses.update.useMutation({
    onSuccess: () => utils.postProcesses.listGrouped.invalidate(),
    onError: (err) => toast.error(`Failed to toggle: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupCode: "",
      code: "",
      name: "",
      processType: "",
      subOptionCode: null,
      subOptionName: null,
      priceBasis: "per_unit",
      sheetStandard: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  const handleOpenCreate = (groupCode?: string) => {
    setEditingId(null);
    form.reset({
      groupCode: groupCode ?? "",
      code: "",
      name: "",
      processType: "",
      subOptionCode: null,
      subOptionName: null,
      priceBasis: "per_unit",
      sheetStandard: null,
      displayOrder: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: PostProcess) => {
    setEditingId(item.id);
    form.reset({
      groupCode: item.groupCode,
      code: item.code,
      name: item.name,
      processType: item.processType,
      subOptionCode: item.subOptionCode,
      subOptionName: item.subOptionName,
      priceBasis: item.priceBasis,
      sheetStandard: item.sheetStandard,
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

  const columns: ColumnDef<PostProcess, unknown>[] = useMemo(
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
        accessorKey: "processType",
        header: "Process Type",
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("processType")}</Badge>
        ),
      },
      {
        accessorKey: "subOptionName",
        header: "Sub Option",
        cell: ({ row }) => row.original.subOptionName ?? "-",
      },
      {
        accessorKey: "priceBasis",
        header: "Price Basis",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.getValue("priceBasis")}</Badge>
        ),
      },
      {
        accessorKey: "sheetStandard",
        header: "Sheet",
        cell: ({ row }) => row.original.sheetStandard ?? "-",
        size: 70,
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

  const grouped = groupedQuery.data as Record<string, PostProcess[]> | undefined;
  const groupKeys = grouped ? Object.keys(grouped).sort() : [];
  const totalCount = grouped
    ? Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Post Processes
          </h1>
          <p className="text-muted-foreground">
            Manage post-processing options by group ({totalCount} processes in{" "}
            {groupKeys.length} groups)
          </p>
        </div>
        <Button onClick={() => handleOpenCreate()}>
          <Plus className="h-4 w-4 mr-1" />
          Add Post Process
        </Button>
      </div>

      {groupedQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-md border bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No post processes found.
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupKeys}
          className="space-y-2"
        >
          {groupKeys.map((groupCode) => {
            const items = grouped![groupCode] as PostProcess[];
            const label = GROUP_LABELS[groupCode] ?? groupCode;
            return (
              <AccordionItem
                key={groupCode}
                value={groupCode}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <DataTable
                      columns={columns}
                      data={items}
                      searchPlaceholder="Search within group..."
                      pageSize={10}
                      toolbarActions={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreate(groupCode)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to {label}
                        </Button>
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Edit Post Process"
                : "Create Post Process"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="groupCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(GROUP_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. FOIL_GOLD" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Gold Foil Stamping" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="processType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. foil_stamp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceBasis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Basis</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="per_unit">Per Unit</SelectItem>
                          <SelectItem value="per_sheet">Per Sheet</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="subOptionCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Option Code</FormLabel>
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
                  name="subOptionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Option Name</FormLabel>
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
                <FormField
                  control={form.control}
                  name="sheetStandard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sheet Standard</FormLabel>
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
                          <SelectItem value="none">None</SelectItem>
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
        title="Deactivate Post Process"
        description="This will set the post process as inactive. Continue?"
        confirmLabel="Deactivate"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
