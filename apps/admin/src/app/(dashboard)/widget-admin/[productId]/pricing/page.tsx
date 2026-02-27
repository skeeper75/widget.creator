'use client';

// @MX:NOTE: [AUTO] PricingPage — Step 4 of Widget Admin wizard; price mode config and real-time test
// @MX:SPEC: SPEC-WA-001 FR-WA001-10 through FR-WA001-15
// @MX:NOTE: [AUTO] GLM NL panel integrated per SPEC-WB-007 FR-WB007-05

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NlRulePanel } from '@/components/glm/nl-rule-panel';
import { ConversionPreview } from '@/components/glm/conversion-preview';
import type { ConversionResult } from '@/components/glm/conversion-preview';
import { useGlmConvert } from '@/hooks/use-glm-convert';
import { PriceModeSelector } from '@/components/widget-admin/price-mode-selector';
import { LookupPriceEditor } from '@/components/widget-admin/lookup-price-editor';
import { AreaPriceEditor } from '@/components/widget-admin/area-price-editor';
import { PagePriceEditor } from '@/components/widget-admin/page-price-editor';
import { CompositePriceEditor } from '@/components/widget-admin/composite-price-editor';
import { PostprocessCostEditor } from '@/components/widget-admin/postprocess-cost-editor';
import { QtyDiscountEditor } from '@/components/widget-admin/qty-discount-editor';
import { PriceTestPanel } from '@/components/widget-admin/price-test-panel';

interface PageProps {
  params: Promise<{ productId: string }>;
}

const WIZARD_STEPS = [
  { label: '기본 설정', step: 1, path: '' },
  { label: '주문옵션 설정', step: 2, path: 'options' },
  { label: '제약조건', step: 3, path: 'constraints' },
  { label: '가격 설정', step: 4, path: 'pricing' },
  { label: '시뮬레이션', step: 5, path: 'simulate' },
  { label: '게시', step: 6, path: 'publish' },
] as const;

type PriceMode = 'LOOKUP' | 'AREA' | 'PAGE' | 'COMPOSITE';

export default function PricingPage({ params }: PageProps) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const [isNlPanelOpen, setIsNlPanelOpen] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  const { data: priceConfig, refetch: refetchConfig } = trpc.widgetAdmin.priceConfig.get.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const { convertPriceRule, confirmPriceRule, isConverting, isConfirming } = useGlmConvert();

  const currentMode: PriceMode = (priceConfig?.priceMode as PriceMode) ?? 'LOOKUP';

  const handleNlConvert = async (nlInput: unknown) => {
    const { nlText } = nlInput as { nlText: string };
    try {
      const result = await convertPriceRule({ productId, nlText, ruleType: 'qty_discount' });
      setConversionResult(result.data as ConversionResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'GLM 변환에 실패했습니다');
    }
  };

  const handleNlApply = async () => {
    if (!conversionResult) return;
    try {
      await confirmPriceRule({ productId, nlText: '', ruleType: 'qty_discount', glmOutput: conversionResult });
      setConversionResult(null);
      setIsNlPanelOpen(false);
      await refetchConfig();
      toast.success('가격룰이 GLM 변환으로 추가되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '적용에 실패했습니다');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground" asChild>
              <Link href={`/widget-admin/${productIdStr}/constraints`}>
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">가격룰 &amp; 계산식</h1>
          <p className="text-muted-foreground text-sm">상품 ID: {productId}</p>
        </div>
      </div>

      {/* Wizard breadcrumb — Step 4 of 6 */}
      <nav aria-label="위저드 단계" className="flex items-center gap-1 overflow-x-auto pb-1">
        {WIZARD_STEPS.map(({ label, step, path }) => {
          const href =
            path === ''
              ? `/widget-admin/${productIdStr}`
              : `/widget-admin/${productIdStr}/${path}`;
          const isCurrentStep = step === 4;

          return (
            <div key={step} className="flex items-center gap-1 shrink-0">
              {step > 1 && (
                <span className="text-muted-foreground text-xs">›</span>
              )}
              {isCurrentStep ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                  <span className="font-mono text-[10px] opacity-70">{step}</span>
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="font-mono text-[10px]">{step}</span>
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* GLM AI 가격룰 자동 생성 */}
      <Collapsible open={isNlPanelOpen} onOpenChange={setIsNlPanelOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20">
            {isNlPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            GLM AI 가격룰 자동 생성
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <NlRulePanel
            mode="price_rule"
            productId={productId}
            onConvert={(result) => void handleNlConvert(result)}
          />
          {conversionResult && (
            <ConversionPreview
              result={conversionResult}
              onApply={() => void handleNlApply()}
              onCancel={() => setConversionResult(null)}
              isApplying={isConfirming}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Mode Selector */}
      <PriceModeSelector
        productId={productId}
        currentMode={currentMode}
        config={priceConfig ?? null}
        onUpdated={() => void refetchConfig()}
      />

      {/* Mode-specific editor */}
      {currentMode === 'LOOKUP' && (
        <LookupPriceEditor productId={productId} />
      )}
      {currentMode === 'AREA' && (
        <AreaPriceEditor
          productId={productId}
          config={priceConfig ?? null}
          onUpdated={() => void refetchConfig()}
        />
      )}
      {currentMode === 'PAGE' && (
        <PagePriceEditor
          productId={productId}
          config={priceConfig ?? null}
          onUpdated={() => void refetchConfig()}
        />
      )}
      {currentMode === 'COMPOSITE' && (
        <CompositePriceEditor
          productId={productId}
          config={priceConfig ?? null}
          onUpdated={() => void refetchConfig()}
        />
      )}

      {/* Common editors (always shown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PostprocessCostEditor productId={productId} />
        <QtyDiscountEditor productId={productId} />
      </div>

      {/* Real-time test panel */}
      <PriceTestPanel productId={productId} priceMode={currentMode} />

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href={`/widget-admin/${productIdStr}/constraints`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            이전: 제약조건
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/widget-admin/${productIdStr}/simulate`}>
            다음: 시뮬레이션
            <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
