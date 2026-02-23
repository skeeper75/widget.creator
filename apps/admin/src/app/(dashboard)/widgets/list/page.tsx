"use client";

import { useMemo, useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Copy, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";


/**
 * Widget List page.
 * REQ-E-701: DataTable with name, status badge, apiKey copy, embed code button. CRUD via trpc.widgets.*
 */
export default function WidgetListPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const widgetsQuery = trpc.widgets.list.useQuery();

  const createMutation = trpc.widgets.create.useMutation({
    onSuccess: () => {
      utils.widgets.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      toast.success("Widget created");
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const deleteMutation = trpc.widgets.delete.useMutation({
    onSuccess: () => {
      utils.widgets.list.invalidate();
      setDeleteId(null);
      toast.success("Widget deactivated");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  }, []);

  const widgets = widgetsQuery.data ?? [];

  type Widget = typeof widgets[number];

  const columns: ColumnDef<Widget, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
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
        accessorKey: "widgetId",
        header: "Widget ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.widgetId}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {status}
            </Badge>
          );
        },
        size: 90,
      },
      {
        id: "apiKey",
        header: "API Key",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              copyToClipboard(row.original.widgetId, "Widget ID");
            }}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        ),
        size: 80,
      },
      {
        id: "embed",
        header: "Embed",
        cell: ({ row }) => (
          <EmbedCodeButton
            widgetId={row.original.id}
            onShowCode={setEmbedCode}
          />
        ),
        size: 80,
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
        size: 80,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteId(row.original.id);
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [copyToClipboard],
  );

  if (widgetsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Widgets</h1>
          <p className="text-muted-foreground">Manage embeddable widgets</p>
        </div>
        <LoadingSkeleton variant="table" rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Widgets</h1>
          <p className="text-muted-foreground">
            Manage embeddable widgets ({widgets.length} widgets)
          </p>
        </div>
        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Widget
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={widgets}
        searchPlaceholder="Search widgets..."
        onRowClick={(row) => router.push(`/widgets/${row.id}`)}
        filters={[
          {
            columnId: "status",
            title: "Status",
            options: [...new Set(widgets.map((w) => w.status))].map((s) => ({
              label: s,
              value: s,
            })),
          },
        ]}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widgetName">Widget Name</Label>
              <Input
                id="widgetName"
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="e.g. HuniPrinting Main Widget"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newName.trim()) {
                  toast.error("Widget name is required");
                  return;
                }
                createMutation.mutate({
                  name: newName.trim(),
                  widgetId: crypto.randomUUID().slice(0, 8),
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog
        open={embedCode !== null}
        onOpenChange={(open: boolean) => !open && setEmbedCode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Copy the code below and paste it into your HTML page.
            </p>
            <pre className="rounded-md bg-muted p-4 text-sm font-mono overflow-auto">
              {embedCode}
            </pre>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (embedCode) {
                  copyToClipboard(embedCode, "Embed code");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Widget"
        description="Are you sure you want to deactivate this widget? It will no longer be accessible via the embed code."
        confirmLabel="Deactivate"
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

/** Embed code button that fetches and displays embed code */
function EmbedCodeButton({
  widgetId,
  onShowCode,
}: {
  widgetId: number;
  onShowCode: (code: string) => void;
}) {
  const embedQuery = trpc.widgets.generateEmbedCode.useQuery(
    { id: widgetId },
    { enabled: false },
  );

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await embedQuery.refetch();
    if (result.data) {
      onShowCode(result.data.embedCode);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      <Code2 className="h-3 w-3 mr-1" />
      Embed
    </Button>
  );
}
