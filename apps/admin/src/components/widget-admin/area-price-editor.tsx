'use client';

// @MX:NOTE: [AUTO] AreaPriceEditor — form for AREA mode price parameters (unit price per sqm, min area, formula)
// @MX:SPEC: SPEC-WA-001 FR-WA001-12

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

interface PriceConfig {
  priceMode: string;
  unitPriceSqm?: string | null;
  minAreaSqm?: string | null;
  formulaText?: string | null;
}

interface AreaPriceEditorProps {
  productId: number;
  config: PriceConfig | null;
  onUpdated: () => void;
}

export function AreaPriceEditor({ productId, config, onUpdated }: AreaPriceEditorProps) {
  const [unitPriceSqm, setUnitPriceSqm] = useState('');
  const [minAreaSqm, setMinAreaSqm] = useState('');
  const [formulaText, setFormulaText] = useState('');

  useEffect(() => {
    if (config) {
      setUnitPriceSqm(config.unitPriceSqm ?? '');
      setMinAreaSqm(config.minAreaSqm ?? '');
      setFormulaText(config.formulaText ?? '');
    }
  }, [config]);

  const updateMutation = trpc.widgetAdmin.priceConfig.update.useMutation({
    onSuccess: () => {
      toast.success('면적형 가격 설정이 저장되었습니다.');
      onUpdated();
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      productId,
      priceMode: 'AREA',
      unitPriceSqm: unitPriceSqm || null,
      minAreaSqm: minAreaSqm || null,
      formulaText: formulaText || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">면적형 (AREA) 파라미터</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="unit-price-sqm">단가/sqm (원)</Label>
            <Input
              id="unit-price-sqm"
              type="number"
              value={unitPriceSqm}
              onChange={(e) => setUnitPriceSqm(e.target.value)}
              placeholder="예: 50000"
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-area-sqm">최소 면적 (sqm)</Label>
            <Input
              id="min-area-sqm"
              type="number"
              value={minAreaSqm}
              onChange={(e) => setMinAreaSqm(e.target.value)}
              placeholder="예: 0.1"
              min={0}
              step={0.001}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area-formula-text">공식 설명 (선택)</Label>
          <Textarea
            id="area-formula-text"
            value={formulaText}
            onChange={(e) => setFormulaText(e.target.value)}
            placeholder="계산 공식에 대한 설명을 입력하세요..."
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
