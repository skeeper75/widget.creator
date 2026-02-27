'use client';

// @MX:NOTE: [AUTO] ConstraintsPage — Step 4 of Widget Admin wizard; ECA constraint rule management
// @MX:SPEC: SPEC-WA-001 FR-WA001-16 through FR-WA001-21
// @MX:NOTE: [AUTO] GLM NL panel integrated per SPEC-WB-007 FR-WB007-05

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, TestTube2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { ConstraintList } from '@/components/widget-admin/constraint-list';
import { RuleBuilderDialog } from '@/components/widget-admin/rule-builder-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NlRulePanel } from '@/components/glm/nl-rule-panel';
import { ConversionPreview } from '@/components/glm/conversion-preview';
import type { ConversionResult } from '@/components/glm/conversion-preview';
import { useGlmConvert } from '@/hooks/use-glm-convert';

interface PageProps {
  params: Promise<{ productId: string }>;
}

// Breadcrumb step configuration for the 6-step widget admin wizard
const WIZARD_STEPS = [
  { label: '기본 설정', step: 1, path: '' },
  { label: '주문옵션 설정', step: 2, path: 'options' },
  { label: '제약조건', step: 3, path: 'constraints' },
  { label: '가격 설정', step: 4, path: 'pricing' },
  { label: '시뮬레이션', step: 5, path: 'simulate' },
  { label: '게시', step: 6, path: 'publish' },
] as const;

export default function ConstraintsPage({ params }: PageProps) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isNlPanelOpen, setIsNlPanelOpen] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  // Get option fields for the trigger editor (using shared optionDefinitions)
  const { data: optionDefs } = trpc.widgetAdmin.optionDefs.list.useQuery();
  const { data: constraints, refetch: refetchConstraints } = trpc.widgetAdmin.constraints.list.useQuery({ productId });

  const { convertConstraint, confirmConstraint, isConverting, isConfirming } = useGlmConvert();

  const optionFields = (optionDefs ?? []).map((d) => ({ key: d.key, name: d.name }));

  const handleAddNew = () => {
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditId(id);
    setDialogOpen(true);
  };

  const handleTestAll = () => {
    // Placeholder — rule conflict check would call a future API endpoint
    toast.info('규칙 전체 테스트 기능은 준비 중입니다.');
  };

  const handleNlConvert = async (nlInput: unknown) => {
    const { nlText } = nlInput as { nlText: string };
    try {
      const result = await convertConstraint({ productId, nlText });
      setConversionResult(result.data as ConversionResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'GLM 변환에 실패했습니다');
    }
  };

  const handleNlApply = async () => {
    if (!conversionResult) return;
    try {
      await confirmConstraint({ productId, nlText: '', glmOutput: conversionResult });
      setConversionResult(null);
      setIsNlPanelOpen(false);
      await refetchConstraints();
      toast.success('제약조건이 GLM 변환으로 추가되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '적용에 실패했습니다');
    }
  };

  const constraintCount = constraints?.length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb / Wizard Steps */}
      <nav className="flex gap-1 text-xs text-muted-foreground">
        {WIZARD_STEPS.map((step, idx) => (
          <span key={step.path} className="flex items-center gap-1">
            {idx > 0 && <span>/</span>}
            <Link
              href={`/widget-admin/${productIdStr}${step.path ? '/' + step.path : ''}`}
              className={
                step.path === 'constraints'
                  ? 'font-semibold text-[var(--primary)]'
                  : 'hover:text-foreground'
              }
            >
              {step.step}. {step.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/widget-admin/${productIdStr}/options`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              인쇄 제약조건{' '}
              {constraintCount > 0 && (
                <span className="text-base text-muted-foreground">— {constraintCount}개 규칙</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">IF-THEN 규칙으로 옵션 간 제약조건을 정의합니다</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTestAll} className="gap-1.5">
            <TestTube2 className="h-4 w-4" />
            전체 테스트
          </Button>
          <Button size="sm" onClick={handleAddNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            규칙 추가
          </Button>
        </div>
      </div>

      {/* Constraint List */}
      <ConstraintList productId={productId} onEdit={handleEdit} />

      {/* Next Step Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Link href={`/widget-admin/${productIdStr}/options`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" />
            이전: 주문옵션 설정
          </Button>
        </Link>
        <Link href={`/widget-admin/${productIdStr}/pricing`}>
          <Button>
            다음: 가격 설정
            <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
          </Button>
        </Link>
      </div>

      {/* Rule Builder Dialog */}
      <RuleBuilderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        productId={productId}
        optionFields={optionFields}
        editId={editId}
      />
    </div>
  );
}
