'use client';

// @MX:NOTE: [AUTO] CompositePriceEditor — form for COMPOSITE mode base cost and formula description
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
  baseCost?: string | null;
  formulaText?: string | null;
}

interface CompositePriceEditorProps {
  productId: number;
  config: PriceConfig | null;
  onUpdated: () => void;
}

export function CompositePriceEditor({ productId, config, onUpdated }: CompositePriceEditorProps) {
  const [baseCost, setBaseCost] = useState('');
  const [formulaText, setFormulaText] = useState('');

  useEffect(() => {
    if (config) {
      setBaseCost(config.baseCost ?? '');
      setFormulaText(config.formulaText ?? '');
    }
  }, [config]);

  const updateMutation = trpc.widgetAdmin.priceConfig.update.useMutation({
    onSuccess: () => {
      toast.success('복합가산형 가격 설정이 저장되었습니다.');
      onUpdated();
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      productId,
      priceMode: 'COMPOSITE',
      baseCost: baseCost || null,
      formulaText: formulaText || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">복합가산형 (COMPOSITE) 파라미터</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="base-cost">기본 비용 (원)</Label>
          <Input
            id="base-cost"
            type="number"
            value={baseCost}
            onChange={(e) => setBaseCost(e.target.value)}
            placeholder="예: 10000"
            min={0}
            className="max-w-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="composite-formula-text">공식 설명 (선택)</Label>
          <Textarea
            id="composite-formula-text"
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
