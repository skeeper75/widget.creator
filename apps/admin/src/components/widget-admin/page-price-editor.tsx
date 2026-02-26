'use client';

// @MX:NOTE: [AUTO] PagePriceEditor — form for PAGE mode price parameters (imposition, cover price, binding cost, formula)
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
  imposition?: number | null;
  coverPrice?: string | null;
  bindingCost?: string | null;
  formulaText?: string | null;
}

interface PagePriceEditorProps {
  productId: number;
  config: PriceConfig | null;
  onUpdated: () => void;
}

export function PagePriceEditor({ productId, config, onUpdated }: PagePriceEditorProps) {
  const [imposition, setImposition] = useState('');
  const [coverPrice, setCoverPrice] = useState('');
  const [bindingCost, setBindingCost] = useState('');
  const [formulaText, setFormulaText] = useState('');

  useEffect(() => {
    if (config) {
      setImposition(config.imposition != null ? String(config.imposition) : '');
      setCoverPrice(config.coverPrice ?? '');
      setBindingCost(config.bindingCost ?? '');
      setFormulaText(config.formulaText ?? '');
    }
  }, [config]);

  const updateMutation = trpc.widgetAdmin.priceConfig.update.useMutation({
    onSuccess: () => {
      toast.success('페이지형 가격 설정이 저장되었습니다.');
      onUpdated();
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      productId,
      priceMode: 'PAGE',
      imposition: imposition ? parseInt(imposition) : null,
      coverPrice: coverPrice || null,
      bindingCost: bindingCost || null,
      formulaText: formulaText || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">페이지형 (PAGE) 파라미터</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="imposition">판걸이수 (장/판)</Label>
            <Input
              id="imposition"
              type="number"
              value={imposition}
              onChange={(e) => setImposition(e.target.value)}
              placeholder="예: 4"
              min={1}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-price">표지 출력비 (원)</Label>
            <Input
              id="cover-price"
              type="number"
              value={coverPrice}
              onChange={(e) => setCoverPrice(e.target.value)}
              placeholder="예: 5000"
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="binding-cost">제본 비용 (원)</Label>
            <Input
              id="binding-cost"
              type="number"
              value={bindingCost}
              onChange={(e) => setBindingCost(e.target.value)}
              placeholder="예: 2000"
              min={0}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="page-formula-text">공식 설명 (선택)</Label>
          <Textarea
            id="page-formula-text"
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
