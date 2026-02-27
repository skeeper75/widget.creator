'use client';

// @MX:NOTE: [AUTO] RuleBuilderDialog — modal dialog for creating/editing IF-THEN constraint rules
// @MX:SPEC: SPEC-WA-001 FR-WA001-17, FR-WA001-18, FR-WA001-19

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { TriggerEditor, type TriggerCondition } from './trigger-editor';
import { ActionEditor, type ConstraintAction } from './action-editor';

interface OptionField {
  key: string;
  name: string;
}

interface RuleBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  optionFields: OptionField[];
  editId?: number | null;
}

const DEFAULT_TRIGGER: TriggerCondition = {
  triggerOptionKey: '',
  triggerOperator: 'in',
  triggerValues: [],
  extraConditions: null,
};

export function RuleBuilderDialog({
  open,
  onClose,
  productId,
  optionFields,
  editId,
}: RuleBuilderDialogProps) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<TriggerCondition>(DEFAULT_TRIGGER);
  const [actions, setActions] = useState<ConstraintAction[]>([]);
  const [priority, setPriority] = useState(0);
  const [comment, setComment] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);

  const { data: constraints } = trpc.widgetAdmin.constraints.list.useQuery(
    { productId },
    { enabled: !!editId },
  );

  // Load existing constraint when editing
  useEffect(() => {
    if (editId && constraints) {
      const existing = constraints.find((c) => c.id === editId);
      if (existing) {
        setName(existing.constraintName);
        setTrigger({
          triggerOptionKey: existing.triggerOptionType,
          triggerOperator: existing.triggerOperator,
          triggerValues: Array.isArray(existing.triggerValues)
            ? (existing.triggerValues as string[])
            : [],
          extraConditions: existing.extraConditions as Record<string, unknown> | null,
        });
        setActions((existing.actions as ConstraintAction[]) ?? []);
        setPriority(existing.priority);
        setComment(existing.comment ?? '');
      }
    } else if (!editId) {
      setName('');
      setTrigger(DEFAULT_TRIGGER);
      setActions([]);
      setPriority(0);
      setComment('');
    }
  }, [editId, constraints]);

  const createMutation = trpc.widgetAdmin.constraints.create.useMutation({
    onSuccess: () => {
      utils.widgetAdmin.constraints.list.invalidate({ productId });
      toast.success('제약조건이 추가되었습니다');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.widgetAdmin.constraints.update.useMutation({
    onSuccess: () => {
      utils.widgetAdmin.constraints.list.invalidate({ productId });
      toast.success('제약조건이 수정되었습니다');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('규칙 이름을 입력해주세요');
      return;
    }
    if (!trigger.triggerOptionKey) {
      toast.error('트리거 옵션을 선택해주세요');
      return;
    }
    if (trigger.triggerValues.length === 0) {
      toast.error('트리거 값을 입력해주세요');
      return;
    }
    if (actions.length === 0) {
      toast.error('액션을 하나 이상 추가해주세요');
      return;
    }

    const payload = {
      productId,
      name: name.trim(),
      triggerOptionKey: trigger.triggerOptionKey,
      triggerOperator: trigger.triggerOperator as 'equals' | 'in' | 'not_in' | 'contains' | 'beginsWith' | 'endsWith',
      triggerValues: trigger.triggerValues,
      extraConditions: trigger.extraConditions,
      actions,
      priority,
      comment: comment.trim() || undefined,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? '제약조건 편집' : '새 제약조건 추가'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rule Name */}
          <div className="space-y-1.5">
            <Label className="text-sm">규칙 이름</Label>
            <Input
              placeholder="예: 투명PVC → PP코팅 제외"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Separator />

          {/* Advanced mode toggle */}
          <div className="flex items-center gap-2">
            <Switch id="advanced" checked={advancedMode} onCheckedChange={setAdvancedMode} />
            <Label htmlFor="advanced" className="text-sm cursor-pointer">
              고급 모드 (AND/OR 복합 조건)
            </Label>
          </div>

          {/* Trigger Editor */}
          <TriggerEditor
            optionFields={optionFields}
            value={trigger}
            onChange={setTrigger}
            mode={advancedMode ? 'advanced' : 'simple'}
          />

          <Separator />

          {/* Action Editor */}
          <ActionEditor actions={actions} onChange={setActions} />

          <Separator />

          {/* Priority & Comment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">우선순위</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">메모</Label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="선택 사항"
                className="h-8"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? '저장 중...' : editId ? '수정' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
