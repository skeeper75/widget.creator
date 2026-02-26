'use client';

// @MX:NOTE: [AUTO] PriceModeSelector — RadioGroup for selecting price calculation mode (LOOKUP/AREA/PAGE/COMPOSITE)
// @MX:SPEC: SPEC-WA-001 FR-WA001-10

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

type PriceMode = 'LOOKUP' | 'AREA' | 'PAGE' | 'COMPOSITE';

interface PriceConfig {
  priceMode: string;
  formulaText?: string | null;
  unitPriceSqm?: string | null;
  minAreaSqm?: string | null;
  imposition?: number | null;
  coverPrice?: string | null;
  bindingCost?: string | null;
  baseCost?: string | null;
}

interface PriceModeSelectorProps {
  productId: number;
  currentMode: PriceMode;
  config: PriceConfig | null;
  onUpdated: () => void;
}

const PRICE_MODES: { value: PriceMode; label: string; description: string }[] = [
  {
    value: 'LOOKUP',
    label: '단가표형 (LOOKUP)',
    description: '판형 × 인쇄방식 × 수량 구간별 단가표로 계산합니다.',
  },
  {
    value: 'AREA',
    label: '면적형 (AREA)',
    description: '인쇄 면적(sqm) × 단가로 계산합니다.',
  },
  {
    value: 'PAGE',
    label: '페이지형 (PAGE)',
    description: '판걸이 수 × 출력비 + 제본비로 계산합니다.',
  },
  {
    value: 'COMPOSITE',
    label: '복합가산형 (COMPOSITE)',
    description: '기본 비용 + 옵션별 가산 방식으로 계산합니다.',
  },
];

export function PriceModeSelector({ productId, currentMode, config, onUpdated }: PriceModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PriceMode>(currentMode);

  const updateMutation = trpc.widgetAdmin.priceConfig.update.useMutation({
    onSuccess: () => {
      toast.success('가격 모드가 저장되었습니다.');
      onUpdated();
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      productId,
      priceMode: selectedMode,
      formulaText: config?.formulaText ?? null,
      unitPriceSqm: config?.unitPriceSqm ?? null,
      minAreaSqm: config?.minAreaSqm ?? null,
      imposition: config?.imposition ?? null,
      coverPrice: config?.coverPrice ?? null,
      bindingCost: config?.bindingCost ?? null,
      baseCost: config?.baseCost ?? null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">가격 계산 방식</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedMode}
          onValueChange={(val) => setSelectedMode(val as PriceMode)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {PRICE_MODES.map((mode) => (
            <label
              key={mode.value}
              htmlFor={`price-mode-${mode.value}`}
              className={[
                'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                selectedMode === mode.value
                  ? 'border-[#5538B6] bg-[#EEEBF9]'
                  : 'border-border hover:bg-muted/40',
              ].join(' ')}
            >
              <RadioGroupItem
                value={mode.value}
                id={`price-mode-${mode.value}`}
                className="mt-0.5 shrink-0"
              />
              <div className="space-y-0.5">
                <Label htmlFor={`price-mode-${mode.value}`} className="font-medium cursor-pointer">
                  {mode.label}
                </Label>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || selectedMode === currentMode}
            size="sm"
          >
            {updateMutation.isPending ? '저장 중...' : '모드 저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
