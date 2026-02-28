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

interface PrintMode {
  id: number;
  code: string;
  name: string;
  sides: string;
  colorType: string;
  priceCode: number;
  displayOrder: number;
  isActive: boolean;
}

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Name is required").max(100),
  sides: z.string().min(1, "Sides is required"),
  colorType: z.string().min(1, "Color type is required"),
  priceCode: z.coerce.number().int(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// @MX:NOTE: [AUTO] Print Modes mirror page — reuses printModes router, SPEC-MDM-001 master data section
export default function MasterDataPrintModesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.printModes.list.useQuery();

  const createMutation = trpc.printModes.create.useMutation({
    onSuccess: () => {
      utils.printModes.list.invalidate();
      toast.success("인쇄방식이 생성되었습니다");
      handleCloseForm();
    },
    onError: (err) => toast.error(`생성 실패: ${err.message}`),
  });

  const updateMutation = trpc.printModes.update.useMutation({
    onSuccess: () => {
      utils.printModes.list.invalidate();
      toast.success("인쇄방식이 수정되었습니다");
      handleCloseForm();
    },
    onError: (err) => toast.error(`수정 실패: ${err.message}`),
  });

  const deleteMutation = trpc.printModes.delete.useMutation({
    onSuccess: () => {
      utils.printModes.list.invalidate();
      toast.success("인쇄방식이 비활성화되었습니다");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`비활성화 실패: ${err.message}`);
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = trpc.printModes.update.useMutation({
    onSuccess: () => utils.printModes.list.invalidate(),
    onError: (err) => toast.error(`토글 실패: ${err.message}`),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      sides: "",
      colorType: "",
      priceCode: 0,
      displayOrder: 0,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({
      code: "",
      name: "",
      sides: "",
      colorType: "",
      priceCode: 0,
      displayOrder: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: PrintMode) => {
    setEditingId(item.id);
    form.reset({
      code: item.code,
      name: item.name,
      sides: item.sides,
      colorType: item.colorType,
      priceCode: item.priceCode,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type MutateInput = any;
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: values } as MutateInput);
    } else {
      createMutation.mutate(values as MutateInput);
    }
  };

  const columns: ColumnDef<PrintMode, unknown>[] = useMemo(
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
        accessorKey: "sides",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sides" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("sides")}</Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "colorType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Color Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.getValue("colorType")}</Badge>
        ),
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "priceCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Price Code" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("priceCode")}</span>
        ),
        size: 90,
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                toggleActiveMutation.mutate({ id: item.id, data: { isActive: checked } } as any)
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
    [toggleActiveMutation],
  );

  const data = (listQuery.data ?? []) as PrintMode[];

  // Extract unique values for filters
  const sidesOptions = [...new Set(data.map((d) => d.sides))].map((s) => ({
    label: s,
    value: s,
  }));
  const colorTypeOptions = [...new Set(data.map((d) => d.colorType))].map(
    (c) => ({ label: c, value: c }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">인쇄방식 관리</h1>
          <p className="text-muted-foreground">
            인쇄방식 마스터 데이터를 관리합니다 ({data.length} modes)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          인쇄방식 추가
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        searchPlaceholder="이름 또는 코드로 검색..."
        filters={[
          { columnId: "sides", title: "Sides", options: sidesOptions },
          {
            columnId: "colorType",
            title: "Color Type",
            options: colorTypeOptions,
          },
        ]}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "인쇄방식 수정" : "인쇄방식 추가"}
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
                      <Input {...field} placeholder="e.g. DIGITAL_4C_BOTH" />
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
                      <Input {...field} placeholder="e.g. Digital 4-Color Both Sides" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sides"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sides</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sides" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="colorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mono">Mono</SelectItem>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="spot">Spot</SelectItem>
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
                  name="priceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Code</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="인쇄방식 비활성화"
        description="인쇄방식을 비활성화하면 더 이상 선택할 수 없습니다. 계속하시겠습니까?"
        confirmLabel="비활성화"
        onConfirm={() =>
          deleteId !== null && deleteMutation.mutate({ id: deleteId })
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
