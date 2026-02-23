"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { trpc } from "@/lib/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Material {
  id: number;
  code: string;
  name: string;
  materialType: string;
  thickness: string | null;
  description: string | null;
  isActive: boolean;
}

const materialFormSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  materialType: z.string().min(1).max(30),
  thickness: z.string().max(20).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;

export default function MaterialsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // materials.list returns flat array (no pagination wrapper)
  const materialsQuery = trpc.materials.list.useQuery();

  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      toast.success("Material created");
      setFormOpen(false);
      utils.materials.list.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const updateMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      toast.success("Material updated");
      setFormOpen(false);
      setEditingMaterial(null);
      utils.materials.list.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  // materials.delete is soft delete (sets isActive: false)
  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      toast.success("Material deactivated");
      setDeleteId(null);
      utils.materials.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.materials.update.useMutation({
    onSuccess: () => utils.materials.list.invalidate(),
  });

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      code: "",
      name: "",
      materialType: "",
      thickness: null,
      description: null,
      isActive: true,
    },
  });

  const handleOpenForm = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      form.reset({
        code: material.code,
        name: material.name,
        materialType: material.materialType,
        thickness: material.thickness,
        description: material.description,
        isActive: material.isActive,
      });
    } else {
      setEditingMaterial(null);
      form.reset({
        code: "",
        name: "",
        materialType: "",
        thickness: null,
        description: null,
        isActive: true,
      });
    }
    setFormOpen(true);
  };

  const onSubmit = (values: MaterialFormValues) => {
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // materials.list returns flat array
  const materials = (materialsQuery.data ?? []) as Material[];
  const materialTypes = [...new Set(materials.map((m) => m.materialType))];

  const columns: ColumnDef<Material, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
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
        accessorKey: "materialType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.getValue("materialType")}
          </Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "thickness",
        header: "Thickness",
        cell: ({ row }) => row.original.thickness ?? "-",
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {row.original.description ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          const mat = row.original;
          return (
            <Switch
              checked={mat.isActive}
              onCheckedChange={(checked) =>
                toggleActiveMutation.mutate({
                  id: mat.id,
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
          const mat = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenForm(mat)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteId(mat.id)}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-muted-foreground">
            Manage non-paper materials ({materials.length} materials)
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-1" />
          Add Material
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={materials}
        searchPlaceholder="Search materials..."
        filters={
          materialTypes.length > 0
            ? [
                {
                  columnId: "materialType",
                  title: "Material Type",
                  options: materialTypes.map((t) => ({
                    label: t,
                    value: t,
                  })),
                },
              ]
            : []
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingMaterial(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Edit Material" : "Add Material"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LAMI-MAT" {...field} />
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
                      <Input placeholder="Material name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. lamination, foil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thickness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thickness (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 0.5mm"
                        {...field}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm font-normal">Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingMaterial ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Material</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the material as inactive. Continue?
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
