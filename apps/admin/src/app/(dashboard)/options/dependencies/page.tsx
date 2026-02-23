"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Trash2, Network, TableIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DependencyForm } from "./dependency-form";

interface Product {
  id: number;
  name: string;
  huniCode: string;
}

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
}

interface OptionDependency {
  id: number;
  productId: number;
  parentOptionId: number;
  parentChoiceId: number | null;
  childOptionId: number;
  dependencyType: string;
  isActive: boolean;
}

interface GraphData {
  nodes: number[];
  edges: Array<{
    from: number;
    to: number;
    choiceId: number | null;
    type: string;
  }>;
}

const DEPENDENCY_TYPE_COLORS: Record<string, string> = {
  visibility: "bg-blue-100 text-blue-800",
  value_filter: "bg-purple-100 text-purple-800",
  auto_select: "bg-green-100 text-green-800",
};

function DependencyGraphView({
  graph,
  optionDefinitions,
}: {
  graph: GraphData;
  optionDefinitions: OptionDefinition[];
}) {
  const getOptionName = (id: number) =>
    optionDefinitions.find((d) => d.id === id)?.name ?? `Option #${id}`;

  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-md border border-dashed">
        <p className="text-muted-foreground">No dependencies to visualize.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-md border bg-muted/30">
      <p className="text-sm font-medium">Dependency Graph</p>
      <div className="space-y-2">
        {graph.edges.map((edge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2 rounded bg-background"
          >
            <Badge variant="outline">{getOptionName(edge.from)}</Badge>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">
                {edge.choiceId
                  ? `choice #${edge.choiceId}`
                  : "any choice"}
              </span>
              <span className="text-lg">→</span>
            </div>
            <Badge variant="outline">{getOptionName(edge.to)}</Badge>
            <Badge
              className={`text-xs ${DEPENDENCY_TYPE_COLORS[edge.type] ?? "bg-gray-100 text-gray-800"}`}
            >
              {edge.type}
            </Badge>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <p className="text-xs text-muted-foreground">
          Nodes: {graph.nodes.map((n) => getOptionName(n)).join(", ")}
        </p>
      </div>
    </div>
  );
}

export default function DependenciesPage() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OptionDependency | null>(
    null,
  );

  const utils = trpc.useUtils();

  const productsQuery = trpc.products.list.useQuery();
  const definitionsQuery = trpc.optionDefinitions.list.useQuery();
  const depsQuery = trpc.optionDependencies.listByProduct.useQuery(
    { productId: selectedProductId! },
    { enabled: selectedProductId != null },
  );
  const graphQuery = trpc.optionDependencies.getGraph.useQuery(
    { productId: selectedProductId! },
    { enabled: selectedProductId != null && viewMode === "graph" },
  );

  const products = (productsQuery.data ?? []) as Product[];
  const definitions = (definitionsQuery.data ?? []) as OptionDefinition[];
  const dependencies = (depsQuery.data ?? []) as OptionDependency[];
  const graphData = graphQuery.data as GraphData | undefined;

  const deleteMutation = trpc.optionDependencies.delete.useMutation({
    onSuccess: () => {
      if (selectedProductId != null) {
        utils.optionDependencies.listByProduct.invalidate({
          productId: selectedProductId,
        });
        utils.optionDependencies.getGraph.invalidate({
          productId: selectedProductId,
        });
      }
      setDeleteTarget(null);
      toast.success("Dependency deleted");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const getOptionName = (id: number) =>
    definitions.find((d) => d.id === id)?.name ?? `#${id}`;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const columns: ColumnDef<OptionDependency, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "parentOptionId",
        header: "Parent Option",
        cell: ({ row }) => (
          <Badge variant="outline">
            {getOptionName(row.original.parentOptionId)}
          </Badge>
        ),
      },
      {
        accessorKey: "parentChoiceId",
        header: "Parent Choice",
        cell: ({ row }) => {
          const choiceId = row.original.parentChoiceId;
          return choiceId ? (
            <span className="text-xs font-mono">#{choiceId}</span>
          ) : (
            <span className="text-muted-foreground text-xs">Any</span>
          );
        },
      },
      {
        accessorKey: "childOptionId",
        header: "Child Option",
        cell: ({ row }) => (
          <Badge variant="outline">
            {getOptionName(row.original.childOptionId)}
          </Badge>
        ),
      },
      {
        accessorKey: "dependencyType",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.dependencyType;
          const colorClass =
            DEPENDENCY_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {type}
            </span>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(row.getValue(id)),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        size: 50,
      },
    ],
    [definitions],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Option Dependencies
          </h1>
          <p className="text-muted-foreground">
            Manage parent-child option dependency rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === "graph" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("graph")}
            >
              <Network className="h-4 w-4 mr-1" />
              Graph
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setFormOpen(true)}
            disabled={selectedProductId == null}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Dependency
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Product:</label>
        <Select
          value={selectedProductId?.toString() ?? ""}
          onValueChange={(val) =>
            setSelectedProductId(val ? Number(val) : null)
          }
        >
          <SelectTrigger className="w-[350px]">
            <SelectValue placeholder="Select a product..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name} ({p.huniCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProduct && (
          <Badge variant="secondary">
            {dependencies.length} dependencies
          </Badge>
        )}
      </div>

      {selectedProductId != null ? (
        depsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={dependencies}
            searchPlaceholder="Search dependencies..."
            filters={[
              {
                columnId: "dependencyType",
                title: "Dependency Type",
                options: [
                  { label: "Visibility", value: "visibility" },
                  { label: "Value Filter", value: "value_filter" },
                  { label: "Auto Select", value: "auto_select" },
                ],
              },
            ]}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Dependency Graph: {selectedProduct?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {graphQuery.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : graphData ? (
                <DependencyGraphView
                  graph={graphData}
                  optionDefinitions={definitions}
                />
              ) : null}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="flex items-center justify-center h-48 rounded-md border border-dashed">
          <p className="text-muted-foreground">
            Select a product to view its option dependencies.
          </p>
        </div>
      )}

      <DependencyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        productId={selectedProductId}
        optionDefinitions={definitions}
        onSuccess={() => {
          setFormOpen(false);
          if (selectedProductId != null) {
            utils.optionDependencies.listByProduct.invalidate({
              productId: selectedProductId,
            });
            utils.optionDependencies.getGraph.invalidate({
              productId: selectedProductId,
            });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Dependency"
        description="Are you sure you want to delete this dependency? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
