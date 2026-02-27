'use client';

// @MX:NOTE: [AUTO] OptionRow — single sortable option row with inline expand for SPEC-WA-001 Step 2
// @MX:SPEC: SPEC-WA-001 FR-WA001-05, FR-WA001-07, FR-WA001-09

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { OptionValueEditor } from './option-value-editor';
import { ConstraintSheet } from './constraint-sheet';

interface OptionData {
  id: number;
  productId: number;
  optionDefinitionId: number;
  displayOrder: number;
  isRequired: boolean;
  isVisible: boolean;
  isInternal: boolean;
  uiComponentOverride: string | null;
  defaultChoiceId: number | null;
  isActive: boolean;
  definitionName: string | null;
  definitionKey: string | null;
  definitionClass: string | null;
  choiceCount: number;
  constraintCount: number;
}

interface OptionRowProps {
  productId: number;
  option: OptionData;
}

export function OptionRow({ productId, option }: OptionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConstraintSheetOpen, setIsConstraintSheetOpen] = useState(false);

  const utils = trpc.useUtils();

  const removeMutation = trpc.widgetAdmin.productOptions.remove.useMutation({
    onSuccess: () => {
      toast.success('옵션이 제거되었습니다.');
      void utils.widgetAdmin.productOptions.list.invalidate({ productId });
    },
    onError: (err) => {
      toast.error(`옵션 제거 실패: ${err.message}`);
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRemove = () => {
    removeMutation.mutate({ productId, productOptionId: option.id });
  };

  const displayName = option.definitionName ?? option.definitionKey ?? `Option #${option.id}`;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="border border-[var(--gray-100,_hsl(var(--border)))] rounded-md bg-card"
      >
        {/* Main row */}
        <div className="flex items-center gap-2 px-3 py-3">
          {/* Drag handle */}
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            {...attributes}
            {...listeners}
            aria-label="드래그하여 순서 변경"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Option name */}
          <span className="flex-1 text-sm font-medium">{displayName}</span>

          {/* Required / Optional badge */}
          {option.isRequired ? (
            <Badge variant="default" className="text-xs">필수</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">선택</Badge>
          )}

          {/* Choice count */}
          <span className="text-xs text-muted-foreground">
            선택지 {option.choiceCount}개
          </span>

          {/* Constraint count badge — FR-WA001-09 */}
          {option.constraintCount > 0 && (
            <button
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
              onClick={() => setIsConstraintSheetOpen(true)}
              aria-label="제약조건 보기"
            >
              <AlertCircle className="h-3 w-3" />
              {option.constraintCount}
            </button>
          )}

          {/* Expand / collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={isExpanded ? '옵션값 편집 닫기' : '옵션값 편집 열기'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            aria-label="옵션 제거"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Expanded: option value editor */}
        {isExpanded && (
          <div className="border-t px-3 py-3">
            <OptionValueEditor
              productOptionId={option.id}
              optionDefinitionId={option.optionDefinitionId}
            />
          </div>
        )}
      </div>

      {/* Constraint side sheet */}
      <ConstraintSheet
        open={isConstraintSheetOpen}
        onOpenChange={setIsConstraintSheetOpen}
        productId={productId}
        optionDefinitionId={option.optionDefinitionId}
        optionName={displayName}
      />
    </>
  );
}
