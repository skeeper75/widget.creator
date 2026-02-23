"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";
import { OptionDefinitionForm } from "./option-definition-form";

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
  optionClass: string;
  optionType: string;
  uiComponent: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

const OPTION_CLASS_OPTIONS = [
  { label: "Basic", value: "basic" },
  { label: "Paper", value: "paper" },
  { label: "Print", value: "print" },
  { label: "Binding", value: "binding" },
  { label: "Postprocess", value: "postprocess" },
];

const OPTION_TYPE_OPTIONS = [
  { label: "Select", value: "select" },
  { label: "Range", value: "range" },
  { label: "Toggle", value: "toggle" },
  { label: "Text", value: "text" },
];

const UI_COMPONENT_BADGE_COLORS: Record<string, string> = {
  dropdown: "bg-blue-100 text-blue-800",
  radio: "bg-green-100 text-green-800",
  checkbox: "bg-purple-100 text-purple-800",
  slider: "bg-orange-100 text-orange-800",
  input: "bg-gray-100 text-gray-800",
};

export default function OptionDefinitionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<OptionDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OptionDefinition | null>(null);

  const utils = trpc.useUtils();
  const definitionsQuery = trpc.optionDefinitions.list.useQuery();

  const updateMutation = trpc.optionDefinitions.update.useMutation({
    onSuccess: () => {
      utils.optionDefinitions.list.invalidate();
    },
  });

  const deleteMutation = trpc.optionDefinitions.delete.useMutation({
    onSuccess: () => {
      utils.optionDefinitions.list.invalidate();
      setDeleteTarget(null);
      toast.success("Option definition deactivated");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const columns: ColumnDef<OptionDefinition, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "key",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Key" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("key")}</span>
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
        accessorKey: "optionClass",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Class" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.getValue("optionClass")}
          </Badge>
        ),
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(row.getValue(id)),
      },
      {
        accessorKey: "optionType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs capitalize">
            {row.getValue("optionType")}
          </Badge>
        ),
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(row.getValue(id)),
      },
      {
        accessorKey: "uiComponent",
        header: "UI Component",
        cell: ({ row }) => {
          const val = row.original.uiComponent;
          const colorClass = UI_COMPONENT_BADGE_COLORS[val] ?? "bg-gray-100 text-gray-800";
          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const desc = row.original.description;
          if (!desc) return <span className="text-muted-foreground">-</span>;
          const truncated = desc.length > 40 ? `${desc.slice(0, 40)}...` : desc;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs cursor-help">{truncated}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm">{desc}</p>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "displayOrder",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="text-xs">{row.original.displayOrder}</span>
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          const def = row.original;
          return (
            <Switch
              checked={def.isActive}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  id: def.id,
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
          const def = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditItem(def);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(def)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        size: 90,
      },
    ],
    [updateMutation],
  );

  const definitions = (definitionsQuery.data ?? []) as OptionDefinition[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Option Definitions
          </h1>
          <p className="text-muted-foreground">
            Manage master option type definitions ({definitions.length}{" "}
            definitions)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Definition
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={definitions}
        isLoading={definitionsQuery.isLoading}
        searchPlaceholder="Search by key or name..."
        filters={[
          {
            columnId: "optionClass",
            title: "Class",
            options: OPTION_CLASS_OPTIONS,
          },
          {
            columnId: "optionType",
            title: "Type",
            options: OPTION_TYPE_OPTIONS,
          },
        ]}
      />

      <OptionDefinitionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        editItem={editItem}
        onSuccess={() => {
          setFormOpen(false);
          setEditItem(null);
          utils.optionDefinitions.list.invalidate();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Deactivate Option Definition"
        description={`Are you sure you want to deactivate "${deleteTarget?.name}"? This will set it as inactive.`}
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
