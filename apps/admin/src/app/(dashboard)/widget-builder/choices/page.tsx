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
import { ChoiceEditModal } from "@/components/widget-builder/choice-edit-modal";
import { trpc } from "@/lib/trpc/client";

interface ElementChoice {
  id: number;
  typeId: number;
  choiceKey: string;
  displayName: string;
  value: string | null;
  mesCode: string | null;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// @MX:NOTE: [AUTO] Element Choices page — CRUD admin for optionElementChoices table
export default function ElementChoicesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ElementChoice | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ElementChoice | null>(null);

  const utils = trpc.useUtils();
  const elementTypesQuery = trpc.elementTypes.list.useQuery({});
  const listQuery = trpc.elementChoices.list.useQuery({});

  const deactivateMutation = trpc.elementChoices.deactivate.useMutation({
    onSuccess: () => {
      utils.elementChoices.list.invalidate();
      setDeactivateTarget(null);
      toast.success("Choice deactivated");
    },
    onError: (err) => {
      setDeactivateTarget(null);
      toast.error(err.message);
    },
  });

  const elementTypes = elementTypesQuery.data ?? [];

  // Build a map for quick type lookup: typeId -> typeNameKo
  const typeMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of elementTypes) {
      map[t.id] = t.typeNameKo;
    }
    return map;
  }, [elementTypes]);

  // Filter options from loaded element types
  const elementTypeFilterOptions = useMemo(
    () =>
      elementTypes.map((t) => ({
        label: `${t.typeNameKo} (${t.typeKey})`,
        value: String(t.id),
      })),
    [elementTypes],
  );

  const tableFilters = useMemo(
    () => [
      {
        columnId: "typeId",
        title: "Element Type",
        options: elementTypeFilterOptions,
      },
    ],
    [elementTypeFilterOptions],
  );

  const columns: ColumnDef<ElementChoice, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "typeId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const typeId: number = row.getValue("typeId");
          const typeName = typeMap[typeId] ?? String(typeId);
          return (
            <Badge variant="outline" className="text-xs">
              {typeName}
            </Badge>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(String(row.getValue(id))),
      },
      {
        accessorKey: "choiceKey",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Key" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("choiceKey")}</span>
        ),
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name (KO)" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("displayName")}</span>
        ),
      },
      {
        accessorKey: "mesCode",
        header: "MES Code",
        cell: ({ row }) => {
          const code: string | null = row.getValue("mesCode");
          if (!code) return <span className="text-muted-foreground text-xs">-</span>;
          return <span className="font-mono text-xs">{code}</span>;
        },
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
    [typeMap],
  );

  const data = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Element Choices</h1>
          <p className="text-sm text-muted-foreground">
            Manage widget builder option element choices
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Choice
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        filters={tableFilters}
        searchPlaceholder="Search choices..."
      />

      <ChoiceEditModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditItem(null);
        }}
        elementTypes={elementTypes.map((t) => ({
          id: t.id,
          typeKey: t.typeKey,
          typeNameKo: t.typeNameKo,
        }))}
        editItem={editItem}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate Choice"
        description={`Deactivate "${deactivateTarget?.displayName}"?`}
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
