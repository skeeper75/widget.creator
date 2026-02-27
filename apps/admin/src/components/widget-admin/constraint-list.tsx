'use client';

// @MX:NOTE: [AUTO] ConstraintList — displays ECA constraint rules as IF-THEN cards for a product
// @MX:SPEC: SPEC-WA-001 FR-WA001-16

import { trpc } from '@/lib/trpc/client';
import { ConstraintCard } from './constraint-card';
import { Skeleton } from '@/components/ui/skeleton';

interface ConstraintListProps {
  productId: number;
  onEdit: (constraintId: number) => void;
}

export function ConstraintList({ productId, onEdit }: ConstraintListProps) {
  const { data: constraints, isLoading } = trpc.widgetAdmin.constraints.list.useQuery({ productId });
  const utils = trpc.useUtils();

  const toggleMutation = trpc.widgetAdmin.constraints.toggle.useMutation({
    onSuccess: () => utils.widgetAdmin.constraints.list.invalidate({ productId }),
  });

  const deleteMutation = trpc.widgetAdmin.constraints.delete.useMutation({
    onSuccess: () => utils.widgetAdmin.constraints.list.invalidate({ productId }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!constraints || constraints.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>등록된 제약조건이 없습니다.</p>
        <p className="text-sm">상단의 &quot;+ 규칙 추가&quot; 버튼으로 첫 번째 규칙을 만들어보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {constraints.map((constraint) => (
        <ConstraintCard
          key={constraint.id}
          constraint={{
            id: constraint.id,
            constraintName: constraint.constraintName,
            triggerOptionType: constraint.triggerOptionType,
            triggerOperator: constraint.triggerOperator,
            triggerValues: constraint.triggerValues,
            actions: constraint.actions,
            isActive: constraint.isActive,
            priority: constraint.priority,
            comment: constraint.comment,
            extraConditions: constraint.extraConditions,
          }}
          onToggle={(isActive) => toggleMutation.mutate({ id: constraint.id, productId, isActive })}
          onEdit={() => onEdit(constraint.id)}
          onDelete={() => deleteMutation.mutate({ id: constraint.id, productId })}
          isToggling={toggleMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  );
}
