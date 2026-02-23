"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  KanbanBoard,
  type KanbanCard,
  type MappingStatus,
} from "@/components/editors/kanban-board";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { trpc } from "@/lib/trpc/client";

/**
 * MES Options Kanban page.
 * REQ-E-604: 3-column Kanban for option_choice_mes_mapping statuses.
 */
export default function MesOptionsPage() {
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const kanbanQuery = trpc.optionChoiceMesMappings.listKanban.useQuery();

  const updateStatusMutation = trpc.optionChoiceMesMappings.updateStatus.useMutation({
    onSuccess: () => {
      utils.optionChoiceMesMappings.listKanban.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Collect unique mapping types
  const mappingTypes = useMemo(() => {
    if (!kanbanQuery.data) return [];
    const all = [
      ...(kanbanQuery.data.pending ?? []),
      ...(kanbanQuery.data.mapped ?? []),
      ...(kanbanQuery.data.verified ?? []),
    ];
    return [...new Set(all.map((c) => c.mappingType))];
  }, [kanbanQuery.data]);

  const handleStatusChange = (
    id: number,
    status: MappingStatus,
    extra?: { mesItemId?: number; mesCode?: string; mappedBy?: string },
  ) => {
    updateStatusMutation.mutate({
      id,
      mappingStatus: status,
      mesItemId: extra?.mesItemId,
      mesCode: extra?.mesCode,
      mappedBy: extra?.mappedBy,
    });
  };

  if (kanbanQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            MES Option Mapping
          </h1>
          <p className="text-muted-foreground">
            Kanban board for option-to-MES mapping workflow
          </p>
        </div>
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    );
  }

  const data = kanbanQuery.data ?? { pending: [], mapped: [], verified: [] };

  const total =
    data.pending.length + data.mapped.length + data.verified.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          MES Option Mapping
        </h1>
        <p className="text-muted-foreground">
          Drag cards between columns to update mapping status — {total} total
          mappings
        </p>
      </div>

      <KanbanBoard
        data={data as { pending: KanbanCard[]; mapped: KanbanCard[]; verified: KanbanCard[] }}
        onStatusChange={handleStatusChange}
        mappingTypeFilter={mappingTypeFilter}
        onMappingTypeFilterChange={setMappingTypeFilter}
        mappingTypes={mappingTypes}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
