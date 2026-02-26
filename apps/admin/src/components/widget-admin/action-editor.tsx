'use client';

// @MX:NOTE: [AUTO] ActionEditor — 8-type action selector with dynamic parameter forms for constraint rules
// @MX:SPEC: SPEC-WA-001 FR-WA001-18

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

export type ActionType =
  | 'show_addon_list'
  | 'filter_options'
  | 'exclude_options'
  | 'auto_add'
  | 'require_option'
  | 'show_message'
  | 'change_price_mode'
  | 'set_default';

export type ConstraintAction = {
  type: ActionType;
  [key: string]: unknown;
};

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string; desc: string }[] = [
  { value: 'show_addon_list', label: '부가옵션 목록 표시', desc: '특정 부가옵션 그룹을 표시합니다' },
  { value: 'filter_options', label: '옵션 필터', desc: '특정 옵션 값만 허용합니다' },
  { value: 'exclude_options', label: '옵션 제외', desc: '특정 옵션 값을 숨깁니다' },
  { value: 'auto_add', label: '자동 추가', desc: '부가 아이템을 자동으로 추가합니다' },
  { value: 'require_option', label: '옵션 필수화', desc: '특정 옵션 선택을 필수로 만듭니다' },
  { value: 'show_message', label: '메시지 표시', desc: '사용자에게 메시지를 표시합니다' },
  { value: 'change_price_mode', label: '가격 모드 변경', desc: '가격 계산 방식을 변경합니다' },
  { value: 'set_default', label: '기본값 설정', desc: '옵션의 기본 선택값을 변경합니다' },
];

interface ActionEditorProps {
  actions: ConstraintAction[];
  onChange: (actions: ConstraintAction[]) => void;
}

function ActionParamForm({
  action,
  onChange,
}: {
  action: ConstraintAction;
  onChange: (updated: ConstraintAction) => void;
}) {
  switch (action.type) {
    case 'filter_options':
    case 'exclude_options': {
      const key = action.type === 'filter_options' ? 'allowedValues' : 'excludedValues';
      const values = (action[key] as string[] | undefined) ?? [];
      return (
        <div className="space-y-2">
          <Input
            placeholder="대상 옵션 키"
            value={String(action.targetOptionKey ?? '')}
            onChange={(e) => onChange({ ...action, targetOptionKey: e.target.value })}
            className="h-8 text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {values.map((v, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">
                {v}
                <button
                  type="button"
                  onClick={() => {
                    const next = values.filter((_, j) => j !== i);
                    onChange({ ...action, [key]: next });
                  }}
                  className="ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              placeholder="값 입력 후 Enter"
              className="text-xs border rounded px-2 py-1 h-6 min-w-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) {
                    onChange({ ...action, [key]: [...values, v] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      );
    }
    case 'require_option':
      return (
        <Input
          placeholder="대상 옵션 키"
          value={String(action.targetOptionKey ?? '')}
          onChange={(e) => onChange({ ...action, targetOptionKey: e.target.value })}
          className="h-8 text-xs"
        />
      );
    case 'show_message':
      return (
        <div className="space-y-2">
          <Input
            placeholder="메시지 내용"
            value={String(action.message ?? '')}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
            className="h-8 text-xs"
          />
          <Select
            value={String(action.level ?? 'info')}
            onValueChange={(v) => onChange({ ...action, level: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">정보</SelectItem>
              <SelectItem value="warning">경고</SelectItem>
              <SelectItem value="error">오류</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'set_default':
      return (
        <div className="space-y-2">
          <Input
            placeholder="대상 옵션 키"
            value={String(action.targetOptionKey ?? '')}
            onChange={(e) => onChange({ ...action, targetOptionKey: e.target.value })}
            className="h-8 text-xs"
          />
          <Input
            placeholder="기본값"
            value={String(action.defaultValue ?? '')}
            onChange={(e) => onChange({ ...action, defaultValue: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      );
    case 'show_addon_list':
      return (
        <Input
          type="number"
          placeholder="부가옵션 그룹 ID"
          value={String(action.addonGroupId ?? '')}
          onChange={(e) => onChange({ ...action, addonGroupId: Number(e.target.value) })}
          className="h-8 text-xs"
        />
      );
    case 'auto_add':
      return (
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="부가 아이템 ID"
            value={String(action.addonItemId ?? '')}
            onChange={(e) => onChange({ ...action, addonItemId: Number(e.target.value) })}
            className="h-8 text-xs"
          />
          <Input
            type="number"
            placeholder="수량 (기본값: 1)"
            value={String(action.quantity ?? '')}
            onChange={(e) => onChange({ ...action, quantity: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      );
    case 'change_price_mode':
      return (
        <Input
          type="number"
          placeholder="가격 모드 ID"
          value={String(action.priceModeId ?? '')}
          onChange={(e) => onChange({ ...action, priceModeId: Number(e.target.value) })}
          className="h-8 text-xs"
        />
      );
    default:
      return null;
  }
}

export function ActionEditor({ actions, onChange }: ActionEditorProps) {
  const [newType, setNewType] = useState<ActionType>('filter_options');

  const addAction = () => {
    const newAction: ConstraintAction = { type: newType };
    onChange([...actions, newAction]);
  };

  const updateAction = (index: number, updated: ConstraintAction) => {
    const next = [...actions];
    next[index] = updated;
    onChange(next);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="font-medium text-sm text-muted-foreground">THEN 액션</div>
      {actions.map((action, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <Select
              value={action.type}
              onValueChange={(v) => updateAction(i, { type: v as ActionType })}
            >
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => removeAction(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ActionParamForm action={action} onChange={(updated) => updateAction(i, updated)} />
        </div>
      ))}
      <div className="flex gap-2">
        <Select value={newType} onValueChange={(v) => setNewType(v as ActionType)}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="액션 타입 선택" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={addAction} className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          추가
        </Button>
      </div>
    </div>
  );
}
