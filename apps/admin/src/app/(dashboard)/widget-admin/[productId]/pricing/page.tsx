'use client';

// @MX:NOTE: [AUTO] PricingPage — Step 4 of Widget Admin wizard; price mode config and real-time test
// @MX:SPEC: SPEC-WA-001 FR-WA001-10 through FR-WA001-15

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
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

  const { data: priceConfig, refetch: refetchConfig } = trpc.widgetAdmin.priceConfig.get.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const currentMode: PriceMode = (priceConfig?.priceMode as PriceMode) ?? 'LOOKUP';

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
