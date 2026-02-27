'use client';

// @MX:NOTE: [AUTO] ConstraintCard — IF-THEN rule card with activate toggle, edit, delete
// @MX:SPEC: SPEC-WA-001 FR-WA001-16

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

// Action type labels
const ACTION_LABELS: Record<string, string> = {
  show_addon_list: '부가옵션 표시',
  filter_options: '옵션 필터',
  exclude_options: '옵션 제외',
  auto_add: '자동 추가',
  require_option: '옵션 필수화',
  show_message: '메시지 표시',
  change_price_mode: '가격 모드 변경',
  set_default: '기본값 설정',
};

// Operator labels
const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  in: 'IN',
  not_in: 'NOT IN',
  contains: '포함',
  beginsWith: '시작',
  endsWith: '끝',
};

export interface ConstraintCardData {
  id: number;
  constraintName: string;
  triggerOptionType: string;
  triggerOperator: string;
  triggerValues: unknown;
  actions: unknown;
  isActive: boolean;
  priority: number;
  comment: string | null | undefined;
  extraConditions?: unknown;
}

interface ConstraintCardProps {
  constraint: ConstraintCardData;
  onToggle: (isActive: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}

function formatTriggerValues(values: unknown): string {
  if (Array.isArray(values)) {
    return values.map(String).join(', ');
  }
  return String(values ?? '');
}

function formatActions(actions: unknown): string {
  if (!Array.isArray(actions)) return '';
  return actions
    .map((a) => {
      if (typeof a !== 'object' || !a) return '';
      const action = a as Record<string, unknown>;
      const label = ACTION_LABELS[String(action.type)] ?? String(action.type);
      return label;
    })
    .filter(Boolean)
    .join(', ');
}

export function ConstraintCard({
  constraint,
  onToggle,
  onEdit,
  onDelete,
  isToggling,
  isDeleting,
}: ConstraintCardProps) {
  const triggerValuesStr = formatTriggerValues(constraint.triggerValues);
  const operatorLabel = OPERATOR_LABELS[constraint.triggerOperator] ?? constraint.triggerOperator;
  const actionsStr = formatActions(constraint.actions);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <Switch
        checked={constraint.isActive}
        onCheckedChange={onToggle}
        disabled={isToggling}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{constraint.constraintName}</span>
          {!constraint.isActive && (
            <Badge variant="secondary" className="text-xs">비활성</Badge>
          )}
          {constraint.priority > 0 && (
            <Badge variant="outline" className="text-xs">우선순위 {constraint.priority}</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">IF</span>{' '}
          <code className="bg-muted px-1 rounded">{constraint.triggerOptionType}</code>{' '}
          <span className="text-[var(--primary)]">{operatorLabel}</span>{' '}
          <code className="bg-muted px-1 rounded">{`{${triggerValuesStr}}`}</code>
          {' → '}
          <span className="text-foreground font-medium">THEN</span>{' '}
          <span>{actionsStr}</span>
        </div>
        {constraint.comment && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{constraint.comment}</p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
