'use client';

// @MX:NOTE: [AUTO] Options Page — Step 2 of Widget Admin wizard; product-level option configuration
// @MX:SPEC: SPEC-WA-001 FR-WA001-05, FR-WA001-06, FR-WA001-07, FR-WA001-08, FR-WA001-09

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { OptionList } from '@/components/widget-admin/option-list';
import { OptionAddDialog } from '@/components/widget-admin/option-add-dialog';

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

export default function OptionsPage({ params }: PageProps) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch current options to compute already-added IDs for the dialog
  const { data: options } = trpc.widgetAdmin.productOptions.list.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const alreadyAddedDefinitionIds = (options ?? []).map((o) => o.optionDefinitionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground" asChild>
              <Link href={`/widget-admin/${productId}`}>
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">주문옵션 설정</h1>
          <p className="text-muted-foreground text-sm">상품 ID: {productId}</p>
        </div>

        {/* Add option button */}
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          옵션 추가
        </Button>
      </div>

      {/* Wizard breadcrumb — Step 2 of 6 */}
      <nav aria-label="위저드 단계" className="flex items-center gap-1 overflow-x-auto pb-1">
        {WIZARD_STEPS.map(({ label, step, path }) => {
          const href =
            path === ''
              ? `/widget-admin/${productId}`
              : `/widget-admin/${productId}/${path}`;
          const isCurrentStep = step === 2;

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

      {/* Option list with drag-and-drop */}
      <OptionList productId={productId} />

      {/* Add option dialog */}
      <OptionAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        productId={productId}
        alreadyAddedDefinitionIds={alreadyAddedDefinitionIds}
      />
    </div>
  );
}
