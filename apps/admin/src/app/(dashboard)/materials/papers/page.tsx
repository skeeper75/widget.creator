"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { PaperForm } from "@/components/forms/paper-form";
import { trpc } from "@/lib/trpc/client";

interface Paper {
  id: number;
  code: string;
  name: string;
  abbreviation: string | null;
  weight: number | null;
  sheetSize: string | null;
  costPerReam: string | null;
  sellingPerReam: string | null;
  costPer4Cut: string | null;
  sellingPer4Cut: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function PapersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editedPrices, setEditedPrices] = useState<
    Map<number, { costPerReam?: string; sellingPerReam?: string; costPer4Cut?: string; sellingPer4Cut?: string }>
  >(new Map());

  const utils = trpc.useUtils();

  // papers.list returns flat array (no pagination wrapper)
  const papersQuery = trpc.papers.list.useQuery();

  const updateMutation = trpc.papers.update.useMutation({
    onSuccess: () => {
      utils.papers.list.invalidate();
    },
  });

  // batchUpdatePrices takes array of { id, costPerReam?, sellingPerReam?, costPer4Cut?, sellingPer4Cut? }
  const batchUpdatePricesMutation = trpc.papers.batchUpdatePrices.useMutation({
    onSuccess: () => {
      utils.papers.list.invalidate();
      setEditedPrices(new Map());
      toast.success("Paper prices updated");
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handlePriceEdit = (
    paperId: number,
    field: "costPerReam" | "sellingPerReam" | "costPer4Cut" | "sellingPer4Cut",
    value: string
  ) => {
    setEditedPrices((prev) => {
      const next = new Map(prev);
      const existing = next.get(paperId) ?? {};
      next.set(paperId, { ...existing, [field]: value || undefined });
      return next;
    });
  };

  const handleSavePrices = () => {
    if (editedPrices.size === 0) return;

    // batchUpdatePrices takes flat array of { id, ...priceFields }
    const items = Array.from(editedPrices.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
    batchUpdatePricesMutation.mutate(items);
  };

  const columns: ColumnDef<Paper, unknown>[] = useMemo(
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
        accessorKey: "abbreviation",
        header: "Abbr",
        cell: ({ row }) => row.original.abbreviation ?? "-",
        size: 80,
      },
      {
        accessorKey: "weight",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Weight" />
        ),
        cell: ({ row }) => {
          const w = row.original.weight;
          return w ? `${w}g` : "-";
        },
        size: 80,
      },
      {
        accessorKey: "sheetSize",
        header: "Sheet Size",
        cell: ({ row }) => row.original.sheetSize ?? "-",
        size: 100,
      },
      {
        accessorKey: "costPerReam",
        header: "Cost/Ream",
        cell: ({ row }) => {
          const paper = row.original;
          const edited = editedPrices.get(paper.id);
          return (
            <Input
              type="number"
              className="h-7 w-24 text-xs text-right"
              defaultValue={
                edited?.costPerReam ?? paper.costPerReam ?? ""
              }
              onBlur={(e) =>
                handlePriceEdit(paper.id, "costPerReam", e.target.value)
              }
            />
          );
        },
        size: 100,
      },
      {
        accessorKey: "sellingPerReam",
        header: "Sell/Ream",
        cell: ({ row }) => {
          const paper = row.original;
          const edited = editedPrices.get(paper.id);
          return (
            <Input
              type="number"
              className="h-7 w-24 text-xs text-right"
              defaultValue={
                edited?.sellingPerReam ?? paper.sellingPerReam ?? ""
              }
              onBlur={(e) =>
                handlePriceEdit(paper.id, "sellingPerReam", e.target.value)
              }
            />
          );
        },
        size: 100,
      },
      {
        accessorKey: "costPer4Cut",
        header: "Cost/4Cut",
        cell: ({ row }) => {
          const paper = row.original;
          const edited = editedPrices.get(paper.id);
          return (
            <Input
              type="number"
              className="h-7 w-24 text-xs text-right"
              defaultValue={
                edited?.costPer4Cut ?? paper.costPer4Cut ?? ""
              }
              onBlur={(e) =>
                handlePriceEdit(paper.id, "costPer4Cut", e.target.value)
              }
            />
          );
        },
        size: 100,
      },
      {
        accessorKey: "sellingPer4Cut",
        header: "Sell/4Cut",
        cell: ({ row }) => {
          const paper = row.original;
          const edited = editedPrices.get(paper.id);
          return (
            <Input
              type="number"
              className="h-7 w-24 text-xs text-right"
              defaultValue={
                edited?.sellingPer4Cut ?? paper.sellingPer4Cut ?? ""
              }
              onBlur={(e) =>
                handlePriceEdit(paper.id, "sellingPer4Cut", e.target.value)
              }
            />
          );
        },
        size: 100,
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          const paper = row.original;
          return (
            <Switch
              checked={paper.isActive}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  id: paper.id,
                  data: { isActive: checked },
                })
              }
            />
          );
        },
        size: 70,
      },
    ],
    [editedPrices, updateMutation]
  );

  // papers.list returns flat array
  const papers = (papersQuery.data ?? []) as Paper[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Papers</h1>
          <p className="text-muted-foreground">
            Manage paper specifications and pricing ({papers.length} papers)
          </p>
        </div>
        <div className="flex gap-2">
          {editedPrices.size > 0 && (
            <Button
              onClick={handleSavePrices}
              disabled={batchUpdatePricesMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Prices ({editedPrices.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Paper
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={papers}
        searchPlaceholder="Search by name or code..."
        filters={[
          {
            columnId: "sheetSize",
            title: "Sheet Size",
            options: [...new Set(papers.map((p) => p.sheetSize).filter(Boolean) as string[])]
              .map((s) => ({ label: s, value: s })),
          },
        ]}
      />

      <PaperForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          setFormOpen(false);
          utils.papers.list.invalidate();
        }}
      />
    </div>
  );
}
