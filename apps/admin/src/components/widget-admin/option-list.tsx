'use client';

// @MX:NOTE: [AUTO] OptionList — drag-sortable list of product options for SPEC-WA-001 Step 2
// @MX:SPEC: SPEC-WA-001 FR-WA001-05, FR-WA001-06

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { OptionRow } from './option-row';

interface OptionListProps {
  productId: number;
}

export function OptionList({ productId }: OptionListProps) {
  const utils = trpc.useUtils();

  const { data: options, isLoading } = trpc.widgetAdmin.productOptions.list.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const reorderMutation = trpc.widgetAdmin.productOptions.reorder.useMutation({
    onSuccess: () => {
      void utils.widgetAdmin.productOptions.list.invalidate({ productId });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !options) return;

      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Build new ordered list
      const reordered = [...options];
      const [moved] = reordered.splice(oldIndex, 1);
      if (moved) {
        reordered.splice(newIndex, 0, moved);
      }

      const orderedIds = reordered.map((o) => o.id);
      reorderMutation.mutate({ productId, orderedIds });
    },
    [options, productId, reorderMutation],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!options || options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">
          옵션이 없습니다. 옵션 추가 버튼을 눌러 추가하세요.
        </p>
      </div>
    );
  }

  const ids = options.map((o) => o.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {options.map((option) => (
            <OptionRow
              key={option.id}
              productId={productId}
              option={option}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
