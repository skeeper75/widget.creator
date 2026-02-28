"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, PowerOff, Package } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { AddonGroupEditor } from "@/components/widget-builder/addon-group-editor";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddonGroup {
  id: number;
  groupName: string;
  groupLabel: string | null;
  displayMode: string;
  isRequired: boolean;
  displayOrder: number;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const GroupFormSchema = z.object({
  groupName: z.string().min(1, "Group name is required").max(100),
  groupLabel: z.string().max(100).nullable().optional(),
  displayMode: z.enum(["list", "grid", "carousel"]).default("list"),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  description: z.string().nullable().optional(),
});

type GroupFormValues = z.infer<typeof GroupFormSchema>;

// ─── Create/Edit Group Modal ──────────────────────────────────────────────────

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  editGroup?: AddonGroup | null;
}

function GroupModal({ open, onClose, editGroup }: GroupModalProps) {
  const utils = trpc.useUtils();
  const isEdit = !!editGroup;

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(GroupFormSchema),
    defaultValues: {
      groupName: editGroup?.groupName ?? "",
      groupLabel: editGroup?.groupLabel ?? null,
      displayMode: (editGroup?.displayMode as "list" | "grid" | "carousel") ?? "list",
      isRequired: editGroup?.isRequired ?? false,
      displayOrder: editGroup?.displayOrder ?? 0,
      description: editGroup?.description ?? null,
    },
  });

  const createMutation = trpc.addonGroups.create.useMutation({
    onSuccess: () => {
      utils.addonGroups.list.invalidate();
      toast.success("Addon group created");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.addonGroups.update.useMutation({
    onSuccess: () => {
      utils.addonGroups.list.invalidate();
      toast.success("Addon group updated");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: GroupFormValues) => {
    if (isEdit && editGroup) {
      updateMutation.mutate({ id: editGroup.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Addon Group" : "Create Addon Group"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 표지 코팅 추가옵션" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Label (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Display label override"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">Required selection</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Display mode badge colors ────────────────────────────────────────────────

const DISPLAY_MODE_COLORS: Record<string, string> = {
  list: "bg-blue-100 text-blue-800",
  grid: "bg-purple-100 text-purple-800",
  carousel: "bg-amber-100 text-amber-800",
};

// ─── AddonGroupsPage ──────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] Addon Groups admin page — manage addon group definitions and their product items
// @MX:REASON: UI for creating addon groups used in ECA show_addon_list actions (SPEC-WIDGET-ADMIN-001 Phase 3)
export default function AddonGroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AddonGroup | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AddonGroup | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.addonGroups.list.useQuery();

  const deactivateMutation = trpc.addonGroups.deactivate.useMutation({
    onSuccess: () => {
      utils.addonGroups.list.invalidate();
      setDeactivateTarget(null);
      if (selectedGroupId === deactivateTarget?.id) {
        setSelectedGroupId(null);
      }
      toast.success("Addon group deactivated");
    },
    onError: (err) => {
      setDeactivateTarget(null);
      toast.error(err.message);
    },
  });

  const columns: ColumnDef<AddonGroup, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        size: 60,
      },
      {
        accessorKey: "groupName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.getValue("groupName")}</p>
            {row.original.groupLabel && (
              <p className="text-xs text-muted-foreground">{row.original.groupLabel}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "displayMode",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Display Mode" />,
        cell: ({ row }) => {
          const mode: string = row.getValue("displayMode");
          const colorClass = DISPLAY_MODE_COLORS[mode] ?? "bg-gray-100 text-gray-800";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}
            >
              {mode}
            </span>
          );
        },
      },
      {
        id: "itemsCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
        cell: () => (
          <div className="flex items-center gap-1 text-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">—</span>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "isRequired",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Required" />,
        cell: ({ row }) => {
          const isRequired: boolean = row.getValue("isRequired");
          return isRequired ? (
            <Badge variant="default" className="text-xs">
              Required
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">Optional</span>
          );
        },
      },
      {
        accessorKey: "displayOrder",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.getValue("displayOrder")}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const group = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditGroup(group);
                    setModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Group
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!group.isActive}
                  className="text-destructive gap-2"
                  onClick={() => setDeactivateTarget(group)}
                >
                  <PowerOff className="h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
      },
    ],
    [],
  );

  const data = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Addon Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage add-on product groups for ECA constraints
          </p>
        </div>
        <Button
          onClick={() => {
            setEditGroup(null);
            setModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        onRowClick={(row) =>
          setSelectedGroupId(selectedGroupId === row.id ? null : row.id)
        }
      />

      {/* Inline AddonGroupEditor for selected group */}
      {selectedGroupId !== null && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <AddonGroupEditor
            groupId={selectedGroupId}
            onClose={() => setSelectedGroupId(null)}
          />
        </div>
      )}

      {/* Create/Edit modal */}
      <GroupModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditGroup(null);
        }}
        editGroup={editGroup}
      />

      {/* Deactivate confirm dialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        title="Deactivate Addon Group"
        description={`Are you sure you want to deactivate "${deactivateTarget?.groupName}"? Products in this group will no longer be shown.`}
        onConfirm={() => {
          if (deactivateTarget) {
            deactivateMutation.mutate({ id: deactivateTarget.id });
          }
        }}
        isLoading={deactivateMutation.isPending}
        confirmLabel="Deactivate"
        destructive
      />
    </div>
  );
}
