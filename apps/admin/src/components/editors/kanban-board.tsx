"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { GripVertical, Search } from "lucide-react";

// -- Types --

export type MappingStatus = "pending" | "mapped" | "verified";

export interface KanbanCard {
  id: number;
  optionChoiceId: number;
  optionChoiceName: string | null;
  mesItemId: number | null;
  mesCode: string | null;
  mappingType: string;
  mappingStatus: MappingStatus;
  mappedBy: string | null;
  mappedAt: Date | string | null;
  notes: string | null;
  isActive: boolean;
}

interface MappingDialogData {
  cardId: number;
  targetStatus: MappingStatus;
  mesItemId: string;
  mesCode: string;
}

interface KanbanBoardProps {
  /** Kanban data grouped by status */
  data: {
    pending: KanbanCard[];
    mapped: KanbanCard[];
    verified: KanbanCard[];
  };
  /** Callback when a card's status changes */
  onStatusChange: (
    id: number,
    status: MappingStatus,
    extra?: { mesItemId?: number; mesCode?: string; mappedBy?: string },
  ) => void;
  /** Active mappingType filter (null = all) */
  mappingTypeFilter: string | null;
  /** Callback when mappingType filter changes */
  onMappingTypeFilterChange: (type: string | null) => void;
  /** Available mapping types for filter tabs */
  mappingTypes: string[];
  /** Whether a mutation is in progress */
  isLoading?: boolean;
}

const COLUMN_CONFIG: { key: MappingStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "bg-yellow-100 border-yellow-300" },
  { key: "mapped", label: "Mapped", color: "bg-blue-100 border-blue-300" },
  { key: "verified", label: "Verified", color: "bg-green-100 border-green-300" },
];

/**
 * 3-column Kanban board for option_choice_mes_mapping statuses.
 * REQ-E-604: dnd-kit drag between Pending | Mapped | Verified columns.
 */
export function KanbanBoard({
  data,
  onStatusChange,
  mappingTypeFilter,
  onMappingTypeFilterChange,
  mappingTypes,
  isLoading = false,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [search, setSearch] = useState("");
  const [mappingDialog, setMappingDialog] = useState<MappingDialogData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ cardId: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Filter cards by mappingType and search
  const filterCards = useCallback(
    (cards: KanbanCard[]) => {
      let filtered = cards;
      if (mappingTypeFilter) {
        filtered = filtered.filter((c) => c.mappingType === mappingTypeFilter);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.optionChoiceName?.toLowerCase().includes(q) ||
            c.mesCode?.toLowerCase().includes(q) ||
            String(c.optionChoiceId).includes(q),
        );
      }
      return filtered;
    },
    [mappingTypeFilter, search],
  );

  const columns = useMemo(
    () =>
      COLUMN_CONFIG.map((col) => ({
        ...col,
        cards: filterCards(data[col.key]),
      })),
    [data, filterCards],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = Number(event.active.id);
    const all = [...data.pending, ...data.mapped, ...data.verified];
    const card = all.find((c) => c.id === cardId);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = Number(active.id);
    const targetColumn = String(over.id) as MappingStatus;

    // Find current card
    const all = [...data.pending, ...data.mapped, ...data.verified];
    const card = all.find((c) => c.id === cardId);
    if (!card || card.mappingStatus === targetColumn) return;

    // Pending -> Mapped: show dialog for mesItemId + mesCode
    if (card.mappingStatus === "pending" && targetColumn === "mapped") {
      setMappingDialog({
        cardId,
        targetStatus: "mapped",
        mesItemId: "",
        mesCode: "",
      });
      return;
    }

    // Mapped -> Verified: show confirm dialog (REQ-C-003 validation)
    if (card.mappingStatus === "mapped" && targetColumn === "verified") {
      setConfirmDialog({ cardId });
      return;
    }

    // Other transitions (e.g. backward): direct update
    onStatusChange(cardId, targetColumn);
  };

  const handleMappingConfirm = () => {
    if (!mappingDialog) return;
    const mesItemId = mappingDialog.mesItemId
      ? Number(mappingDialog.mesItemId)
      : undefined;
    onStatusChange(mappingDialog.cardId, mappingDialog.targetStatus, {
      mesItemId,
      mesCode: mappingDialog.mesCode || undefined,
      mappedBy: "admin",
    });
    setMappingDialog(null);
  };

  const handleVerifyConfirm = () => {
    if (!confirmDialog) return;
    onStatusChange(confirmDialog.cardId, "verified", {
      mappedBy: "admin",
    });
    setConfirmDialog(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant={mappingTypeFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => onMappingTypeFilterChange(null)}
          >
            All
          </Button>
          {mappingTypes.map((type) => (
            <Button
              key={type}
              variant={mappingTypeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => onMappingTypeFilterChange(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="h-8 pl-8 w-[200px]"
          />
        </div>
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.key}
              id={col.key}
              label={col.label}
              color={col.color}
              cards={col.cards}
              isLoading={isLoading}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCardView card={activeCard} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Mapping dialog: Pending -> Mapped */}
      <Dialog
        open={!!mappingDialog}
        onOpenChange={(open: boolean) => !open && setMappingDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map to MES Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mesItemId">MES Item ID</Label>
              <Input
                id="mesItemId"
                type="number"
                value={mappingDialog?.mesItemId ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMappingDialog((prev) =>
                    prev ? { ...prev, mesItemId: e.target.value } : null,
                  )
                }
                placeholder="Enter MES Item ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mesCode">MES Code</Label>
              <Input
                id="mesCode"
                value={mappingDialog?.mesCode ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMappingDialog((prev) =>
                    prev ? { ...prev, mesCode: e.target.value } : null,
                  )
                }
                placeholder="Enter MES Code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMappingConfirm} disabled={isLoading}>
              Confirm Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify confirm dialog: Mapped -> Verified */}
      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title="Verify Mapping"
        description="Are you sure this mapping is verified? This confirms the MES item mapping is correct."
        confirmLabel="Verify"
        onConfirm={handleVerifyConfirm}
        isLoading={isLoading}
      />
    </div>
  );
}

// -- Column Component --

function KanbanColumn({
  id,
  label,
  color,
  cards,
  isLoading,
}: {
  id: string;
  label: string;
  color: string;
  cards: KanbanCard[];
  isLoading: boolean;
}) {
  const { setNodeRef } = useSortable({ id, data: { type: "column" } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 p-3 min-h-[400px]",
        color,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {cards.length}
        </Badge>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {cards.map((card) => (
            <SortableKanbanCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
      {cards.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-8">
          No items
        </p>
      )}
    </div>
  );
}

// -- Sortable Card Wrapper --

function SortableKanbanCard({ card }: { card: KanbanCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardView
        card={card}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// -- Card View --

function KanbanCardView({
  card,
  isDragging = false,
  dragHandleProps,
}: {
  card: KanbanCard;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white p-3 shadow-sm",
        isDragging && "shadow-lg ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Drag handle"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              #{card.optionChoiceId}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {card.mappingType}
            </Badge>
          </div>
          <p className="text-sm font-medium truncate">
            {card.optionChoiceName ?? `Choice ${card.optionChoiceId}`}
          </p>
          {card.mesCode && (
            <p className="text-xs text-muted-foreground mt-1">
              MES: {card.mesCode}
            </p>
          )}
          {card.mappedBy && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              by {card.mappedBy}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
