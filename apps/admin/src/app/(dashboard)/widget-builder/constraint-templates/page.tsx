"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, PowerOff, Shield } from "lucide-react";
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
import { TemplateDetailPanel } from "@/components/widget-builder/template-detail-panel";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstraintTemplate {
  id: number;
  templateKey: string;
  templateNameKo: string;
  description: string | null;
  category: string | null;
  triggerOptionType: string | null;
  triggerOperator: string | null;
  triggerValuesPattern: unknown;
  extraConditionsPattern: unknown;
  actionsPattern: unknown;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
}

// ─── Filter options ───────────────────────────────────────────────────────────

const TYPE_FILTER_OPTIONS = [
  { label: "System", value: "true" },
  { label: "Custom", value: "false" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

const TABLE_FILTERS = [
  { columnId: "isSystem", title: "Type", options: TYPE_FILTER_OPTIONS },
  { columnId: "isActive", title: "Status", options: STATUS_FILTER_OPTIONS },
];

// ─── ConstraintTemplatesPage ──────────────────────────────────────────────────

// @MX:NOTE: [AUTO] Constraint Templates admin page — list, detail panel, create/edit custom templates
// @MX:REASON: Central UI for ECA constraint template library management (SPEC-WIDGET-ADMIN-001 Phase 3)
export default function ConstraintTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ConstraintTemplate | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ConstraintTemplate | null>(null);
  const [showConstraintBuilder, setShowConstraintBuilder] = useState(false);

  const utils = trpc.useUtils();

  const listQuery = trpc.constraintTemplates.list.useQuery({});

  const deactivateMutation = trpc.constraintTemplates.deactivate.useMutation({
    onSuccess: () => {
      utils.constraintTemplates.list.invalidate();
      setDeactivateTarget(null);
      if (selectedTemplate?.id === deactivateTarget?.id) {
        setSelectedTemplate(null);
      }
      toast.success("Template deactivated");
    },
    onError: (err) => {
      setDeactivateTarget(null);
      toast.error(err.message);
    },
  });

  const columns: ColumnDef<ConstraintTemplate, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        size: 60,
      },
      {
        accessorKey: "templateNameKo",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Template Name" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.getValue("templateNameKo")}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.templateKey}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => {
          const val: string | null = row.getValue("category");
          return val ? (
            <Badge variant="outline" className="capitalize text-xs">
              {val}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
        filterFn: (row, id, value: string[]) => {
          return value.includes(String(row.getValue(id)));
        },
      },
      {
        accessorKey: "triggerOptionType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trigger Type" />,
        cell: ({ row }) => {
          const val: string | null = row.getValue("triggerOptionType");
          return val ? (
            <span className="font-mono text-xs">{val}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        accessorKey: "isSystem",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const isSystem: boolean = row.getValue("isSystem");
          return isSystem ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              System
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Custom
            </Badge>
          );
        },
        filterFn: (row, id, value: string[]) => {
          return value.includes(String(row.getValue(id)));
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const isActive: boolean = row.getValue("isActive");
          return (
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          );
        },
        filterFn: (row, id, value: string[]) => {
          return value.includes(String(row.getValue(id)));
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const tpl = row.original;
          const isSystem = tpl.isSystem;

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
                  disabled={isSystem}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setShowConstraintBuilder(true);
                  }}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                  {isSystem && (
                    <span className="text-xs text-muted-foreground ml-auto">(read-only)</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isSystem || !tpl.isActive}
                  className="text-destructive gap-2"
                  onClick={() => setDeactivateTarget(tpl)}
                >
                  <PowerOff className="h-4 w-4" />
                  Deactivate
                  {isSystem && (
                    <span className="text-xs text-muted-foreground ml-auto">(read-only)</span>
                  )}
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
          <h1 className="text-2xl font-bold">Constraint Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ECA (Event-Condition-Action) constraint template library
          </p>
        </div>
        <Button onClick={() => { setSelectedTemplate(null); setShowConstraintBuilder(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Main content: table + detail panel */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Table */}
        <div className={selectedTemplate ? "xl:col-span-3" : "xl:col-span-5"}>
          <DataTable
            columns={columns}
            data={data}
            isLoading={listQuery.isLoading}
            filters={TABLE_FILTERS}
            onRowClick={(row) =>
              setSelectedTemplate(selectedTemplate?.id === row.id ? null : row)
            }
          />
        </div>

        {/* Detail panel */}
        {selectedTemplate && (
          <div className="xl:col-span-2">
            <TemplateDetailPanel
              template={selectedTemplate}
              onEdit={(tpl) => {
                setSelectedTemplate(tpl);
                setShowConstraintBuilder(true);
              }}
            />
          </div>
        )}
      </div>

      {/* TODO: Create/Edit template modal — use ConstraintBuilder integration when available */}
      {showConstraintBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <p className="text-sm text-muted-foreground text-center">
              Template editor coming soon. Use the ECA Constraint Builder to create templates.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setShowConstraintBuilder(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate confirm dialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        title="Deactivate Template"
        description={`Are you sure you want to deactivate "${deactivateTarget?.templateNameKo}"? This template will no longer be available for recipe constraints.`}
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
