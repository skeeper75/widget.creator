"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ElementTypeEditModal } from "@/components/widget-builder/element-type-edit-modal";
import { trpc } from "@/lib/trpc/client";

interface ElementType {
  id: number;
  typeKey: string;
  typeNameKo: string;
  typeNameEn: string;
  uiControl: string;
  optionCategory: string;
  allowsCustom: boolean;
  displayOrder: number;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORY_FILTER_OPTIONS = [
  { label: "Material", value: "material" },
  { label: "Process", value: "process" },
  { label: "Spec", value: "spec" },
  { label: "Quantity", value: "quantity" },
  { label: "Group", value: "group" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

const TABLE_FILTERS = [
  { columnId: "optionCategory", title: "Category", options: CATEGORY_FILTER_OPTIONS },
  { columnId: "isActive", title: "Status", options: STATUS_FILTER_OPTIONS },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  material: "bg-blue-100 text-blue-800",
  process: "bg-purple-100 text-purple-800",
  spec: "bg-green-100 text-green-800",
  quantity: "bg-orange-100 text-orange-800",
  group: "bg-gray-100 text-gray-800",
};

// @MX:NOTE: [AUTO] Element Types page — CRUD admin for optionElementTypes table
export default function ElementTypesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ElementType | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ElementType | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.elementTypes.list.useQuery({});

  const deactivateMutation = trpc.elementTypes.deactivate.useMutation({
    onSuccess: () => {
      utils.elementTypes.list.invalidate();
      setDeactivateTarget(null);
      toast.success("Element type deactivated");
    },
    onError: (err) => {
      setDeactivateTarget(null);
      toast.error(err.message);
    },
  });

  const columns: ColumnDef<ElementType, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "typeKey",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type Key" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("typeKey")}</span>
        ),
      },
      {
        accessorKey: "typeNameKo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name (KO)" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("typeNameKo")}</span>
        ),
      },
      {
        accessorKey: "optionCategory",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const val: string = row.getValue("optionCategory");
          const colorClass = CATEGORY_BADGE_COLORS[val] ?? "bg-gray-100 text-gray-800";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}
            >
              {val}
            </span>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(row.getValue(id)),
      },
      {
        accessorKey: "uiControl",
        header: "UI Control",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue("uiControl")}
          </Badge>
        ),
      },
      {
        accessorKey: "displayOrder",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sort Order" />
        ),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{row.original.displayOrder}</span>
        ),
        size: 90,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const active: boolean = row.getValue("isActive");
          return (
            <Badge variant={active ? "default" : "secondary"} className="text-xs">
              {active ? "Active" : "Inactive"}
            </Badge>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(String(row.getValue(id))),
      },
      {
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditItem(item);
                    setModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {item.isActive && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeactivateTarget(item)}
                  >
                    <PowerOff className="h-4 w-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  const data = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Element Types</h1>
          <p className="text-sm text-muted-foreground">
            Manage widget builder option element types
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Element Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        filters={TABLE_FILTERS}
        searchPlaceholder="Search element types..."
      />

      <ElementTypeEditModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditItem(null);
        }}
        editItem={editItem}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate Element Type"
        description={`Deactivate "${deactivateTarget?.typeNameKo}"? This will make it unavailable.`}
        confirmLabel="Deactivate"
        destructive
        isLoading={deactivateMutation.isPending}
        onConfirm={() => {
          if (deactivateTarget) {
            deactivateMutation.mutate({ id: deactivateTarget.id });
          }
        }}
      />
    </div>
  );
}
