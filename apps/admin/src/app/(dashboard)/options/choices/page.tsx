"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";
import { OptionChoiceForm } from "./option-choice-form";

interface OptionChoice {
  id: number;
  optionDefinitionId: number;
  code: string;
  name: string;
  priceKey: string | null;
  refPaperId: number | null;
  refMaterialId: number | null;
  refPrintModeId: number | null;
  refPostProcessId: number | null;
  refBindingId: number | null;
  displayOrder: number;
  isActive: boolean;
}

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
}

function RefLink({ label, id }: { label: string; id: number | null }) {
  if (!id) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
          <LinkIcon className="h-3 w-3" />
          {label}#{id}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label} ID: {id}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function OptionChoicesPage() {
  const [selectedDefId, setSelectedDefId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<OptionChoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OptionChoice | null>(null);

  const utils = trpc.useUtils();

  const definitionsQuery = trpc.optionDefinitions.list.useQuery();
  const definitions = (definitionsQuery.data ?? []) as OptionDefinition[];

  const choicesQuery = trpc.optionChoices.listByDefinition.useQuery(
    { optionDefinitionId: selectedDefId! },
    { enabled: selectedDefId != null },
  );

  const updateMutation = trpc.optionChoices.update.useMutation({
    onSuccess: () => {
      if (selectedDefId != null) {
        utils.optionChoices.listByDefinition.invalidate({
          optionDefinitionId: selectedDefId,
        });
      }
    },
  });

  const deleteMutation = trpc.optionChoices.delete.useMutation({
    onSuccess: () => {
      if (selectedDefId != null) {
        utils.optionChoices.listByDefinition.invalidate({
          optionDefinitionId: selectedDefId,
        });
      }
      setDeleteTarget(null);
      toast.success("Option choice deactivated");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const selectedDef = definitions.find((d) => d.id === selectedDefId);

  const columns: ColumnDef<OptionChoice, unknown>[] = useMemo(
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
        accessorKey: "priceKey",
        header: "Price Key",
        cell: ({ row }) => {
          const pk = row.original.priceKey;
          if (!pk) return <span className="text-muted-foreground">-</span>;
          return (
            <Badge variant="outline" className="font-mono text-xs">
              {pk}
            </Badge>
          );
        },
      },
      {
        id: "references",
        header: "References",
        cell: ({ row }) => {
          const c = row.original;
          const refs = [
            { label: "Paper", id: c.refPaperId },
            { label: "Material", id: c.refMaterialId },
            { label: "PrintMode", id: c.refPrintModeId },
            { label: "PostProcess", id: c.refPostProcessId },
            { label: "Binding", id: c.refBindingId },
          ].filter((r) => r.id != null);

          if (refs.length === 0) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {refs.map((r) => (
                <RefLink key={r.label} label={r.label} id={r.id} />
              ))}
            </div>
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
          const choice = row.original;
          return (
            <Switch
              checked={choice.isActive}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  id: choice.id,
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
          const choice = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditItem(choice);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(choice)}
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

  const choices = (choicesQuery.data ?? []) as OptionChoice[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Option Choices</h1>
          <p className="text-muted-foreground">
            Manage available choices per option definition
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
          disabled={selectedDefId == null}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Choice
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Definition:</label>
        <Select
          value={selectedDefId?.toString() ?? ""}
          onValueChange={(val) =>
            setSelectedDefId(val ? Number(val) : null)
          }
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select an option definition..." />
          </SelectTrigger>
          <SelectContent>
            {definitions.map((def) => (
              <SelectItem key={def.id} value={def.id.toString()}>
                {def.name} ({def.key})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedDef && (
          <Badge variant="secondary">{choices.length} choices</Badge>
        )}
      </div>

      {selectedDefId != null ? (
        <DataTable
          columns={columns}
          data={choices}
          isLoading={choicesQuery.isLoading}
          searchPlaceholder="Search by code or name..."
          emptyMessage={`No choices found for "${selectedDef?.name ?? ""}".`}
        />
      ) : (
        <div className="flex items-center justify-center h-48 rounded-md border border-dashed">
          <p className="text-muted-foreground">
            Select an option definition to view its choices.
          </p>
        </div>
      )}

      <OptionChoiceForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        editItem={editItem}
        optionDefinitionId={selectedDefId}
        onSuccess={() => {
          setFormOpen(false);
          setEditItem(null);
          if (selectedDefId != null) {
            utils.optionChoices.listByDefinition.invalidate({
              optionDefinitionId: selectedDefId,
            });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Deactivate Option Choice"
        description={`Are you sure you want to deactivate "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
