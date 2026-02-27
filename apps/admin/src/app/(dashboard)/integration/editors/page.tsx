"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { JsonEditor } from "@/components/editors/json-editor";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";

interface UnmappedProduct {
  id: number;
  name: string;
}

/**
 * Editor Mappings page - DataTable with JSON editor for templateConfig.
 * REQ-E-603: Manage product-to-editor mappings with JSONB templateConfig editing.
 */
export default function EditorMappingsPage() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editJsonValue, setEditJsonValue] = useState<unknown>(null);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({
    productId: "",
    editorType: "edicus",
    templateId: "",
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.productEditorMappings.list.useQuery();
  const unmappedQuery = trpc.productEditorMappings.listUnmapped.useQuery();

  const createMutation = trpc.productEditorMappings.create.useMutation({
    onSuccess: () => {
      utils.productEditorMappings.list.invalidate();
      utils.productEditorMappings.listUnmapped.invalidate();
      setCreateDialog(false);
      setNewMapping({ productId: "", editorType: "edicus", templateId: "" });
      toast.success("Editor mapping created");
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.productEditorMappings.update.useMutation({
    onSuccess: () => {
      utils.productEditorMappings.list.invalidate();
      setEditingId(null);
      toast.success("Template config updated");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const deleteMutation = trpc.productEditorMappings.delete.useMutation({
    onSuccess: () => {
      utils.productEditorMappings.list.invalidate();
      utils.productEditorMappings.listUnmapped.invalidate();
      setDeleteId(null);
      toast.success("Editor mapping deleted");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const mappings = listQuery.data ?? [];
  const unmappedProducts = (unmappedQuery.data ?? []) as UnmappedProduct[];

  // Filter: show only unmapped or all
  const displayedMappings = showUnmapped ? [] : mappings;

  type EditorMapping = typeof mappings[number];

  const columns: ColumnDef<EditorMapping, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "productName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.productName ?? `Product #${row.original.productId}`}
          </span>
        ),
      },
      {
        accessorKey: "editorType",
        header: "Editor Type",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.editorType}</Badge>
        ),
        size: 100,
      },
      {
        accessorKey: "templateId",
        header: "Template ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.templateId ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "templateConfig",
        header: "Config",
        cell: ({ row }) => {
          const hasConfig =
            row.original.templateConfig != null &&
            JSON.stringify(row.original.templateConfig) !== "null";
          return (
            <div className="flex items-center gap-2">
              <Badge variant={hasConfig ? "default" : "secondary"}>
                {hasConfig ? "Configured" : "Empty"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(row.original.id);
                  setEditJsonValue(row.original.templateConfig);
                }}
              >
                Edit
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
        size: 80,
      },
      {
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(row.original.id)}
          >
            Delete
          </Button>
        ),
      },
    ],
    [],
  );

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editor Mappings
          </h1>
          <p className="text-muted-foreground">
            Product-to-editor template configurations
          </p>
        </div>
        <LoadingSkeleton variant="table" rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editor Mappings
          </h1>
          <p className="text-muted-foreground">
            Product-to-editor template configurations ({mappings.length}{" "}
            mappings, {unmappedProducts.length} unmapped)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showUnmapped ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnmapped(!showUnmapped)}
          >
            {showUnmapped ? "Show Mapped" : "Show Unmapped"}
          </Button>
          <Button variant="outline" onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Mapping
          </Button>
        </div>
      </div>

      {showUnmapped ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            Unmapped Products ({unmappedProducts.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Products with editorEnabled=true but no editor mapping configured.
          </p>
          {unmappedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              All editor-enabled products are mapped.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {unmappedProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{p.id}
                  </span>
                  <p className="font-medium">{p.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={displayedMappings}
          searchPlaceholder="Search by product name..."
          filters={[
            {
              columnId: "editorType",
              title: "Editor Type",
              options: [
                ...new Set(mappings.map((m) => m.editorType)),
              ].map((t) => ({ label: t, value: t })),
            },
          ]}
        />
      )}

      {/* JSON Editor Dialog */}
      <Dialog
        open={editingId !== null}
        onOpenChange={(open: boolean) => !open && setEditingId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template Config</DialogTitle>
          </DialogHeader>
          <JsonEditor
            value={editJsonValue}
            onChange={setEditJsonValue}
            minHeight="300px"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingId === null) return;
                updateMutation.mutate({
                  id: editingId,
                  data: { templateConfig: editJsonValue as null },
                });
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Config"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onOpenChange={(open: boolean) => !open && setCreateDialog(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Editor Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="createProductId">Product ID</Label>
              <Input
                id="createProductId"
                type="number"
                value={newMapping.productId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewMapping((prev) => ({
                    ...prev,
                    productId: e.target.value,
                  }))
                }
                placeholder="Enter product ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createEditorType">Editor Type</Label>
              <Input
                id="createEditorType"
                value={newMapping.editorType}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewMapping((prev) => ({
                    ...prev,
                    editorType: e.target.value,
                  }))
                }
                placeholder="e.g. edicus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createTemplateId">Template ID (optional)</Label>
              <Input
                id="createTemplateId"
                value={newMapping.templateId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewMapping((prev) => ({
                    ...prev,
                    templateId: e.target.value,
                  }))
                }
                placeholder="Enter template ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newMapping.productId) {
                  toast.error("Product ID is required");
                  return;
                }
                createMutation.mutate({
                  productId: Number(newMapping.productId),
                  editorType: newMapping.editorType,
                  templateId: newMapping.templateId || null,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Editor Mapping"
        description="Are you sure you want to delete this editor mapping? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteMutation.mutate({ id: deleteId });
          }
        }}
        destructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
