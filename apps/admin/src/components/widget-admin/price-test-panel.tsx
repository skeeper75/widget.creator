'use client';

// @MX:NOTE: [AUTO] PriceTestPanel — real-time price quote test panel for admin step 4 validation
// @MX:SPEC: SPEC-WA-001 FR-WA001-15

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';

type PriceMode = 'LOOKUP' | 'AREA' | 'PAGE' | 'COMPOSITE';

interface PriceTestPanelProps {
  productId: number;
  priceMode: PriceMode;
}

function formatKRW(val: string | number): string {
  return Number(val).toLocaleString('ko-KR') + '원';
}

export function PriceTestPanel({ productId, priceMode }: PriceTestPanelProps) {
  const [plateType, setPlateType] = useState('');
  const [printMode, setPrintMode] = useState('');
  const [qty, setQty] = useState(100);
  const [selectedProcessCodes, setSelectedProcessCodes] = useState<string[]>([]);
  const [runTest, setRunTest] = useState(false);

  const { data: postprocessList } = trpc.widgetAdmin.postprocessCost.list.useQuery(
    { productId },
    { staleTime: 30_000 },
  );

  const { data: testResult, isFetching } = trpc.widgetAdmin.pricingTest.useQuery(
    {
      productId,
      plateType: plateType || undefined,
      printMode: printMode || undefined,
      qty,
      selectedProcessCodes,
    },
    {
      enabled: runTest,
      staleTime: 0,
    },
  );

  const handleCalculate = () => {
    setRunTest(true);
  };

  const handleToggleProcess = (code: string) => {
    setSelectedProcessCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    // Reset test result when inputs change
    setRunTest(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">실시간 견적 테스트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {priceMode === 'LOOKUP' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="test-plate-type">판형</Label>
                <Input
                  id="test-plate-type"
                  value={plateType}
                  onChange={(e) => { setPlateType(e.target.value); setRunTest(false); }}
                  placeholder="예: 90x50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-print-mode">인쇄방식</Label>
                <Input
                  id="test-print-mode"
                  value={printMode}
                  onChange={(e) => { setPrintMode(e.target.value); setRunTest(false); }}
                  placeholder="예: 단면칼라"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="test-qty">수량</Label>
            <Input
              id="test-qty"
              type="number"
              value={qty}
              onChange={(e) => { setQty(parseInt(e.target.value) || 1); setRunTest(false); }}
              min={1}
            />
          </div>
        </div>

        {/* Post-process checkboxes */}
        {postprocessList && postprocessList.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">후가공 선택</Label>
            <div className="flex flex-wrap gap-2">
              {postprocessList
                .filter((p) => p.isActive)
                .map((p) => (
                  <label
                    key={p.processCode}
                    className={[
                      'flex items-center gap-1.5 px-2.5 py-1 rounded border cursor-pointer text-sm transition-colors select-none',
                      selectedProcessCodes.includes(p.processCode)
                        ? 'border-[#5538B6] bg-[#EEEBF9] text-[#5538B6]'
                        : 'border-border hover:bg-muted/40',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedProcessCodes.includes(p.processCode)}
                      onChange={() => handleToggleProcess(p.processCode)}
                    />
                    {p.processNameKo}
                  </label>
                ))}
            </div>
          </div>
        )}

        <Button onClick={handleCalculate} disabled={isFetching}>
          {isFetching ? '계산 중...' : '가격 계산'}
        </Button>

        {/* Result breakdown */}
        {isFetching && (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        )}

        {!isFetching && testResult && runTest && (
          <div className="space-y-3 pt-2">
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">기본출력비</span>
                <span>{formatKRW(testResult.baseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">후가공비</span>
                <span>{formatKRW(testResult.postprocessTotal)}</span>
              </div>
              {parseFloat(testResult.discountAmount) > 0 && (
                <div className="flex justify-between text-[#E6B93F]">
                  <span>
                    수량할인
                    {testResult.discountRate && parseFloat(testResult.discountRate) > 0 && (
                      <span className="ml-1 text-xs">
                        ({(parseFloat(testResult.discountRate) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                  <span>-{formatKRW(testResult.discountAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">최종견적가</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#351D87]">
                    {formatKRW(testResult.total)}
                  </span>
                  {parseInt(testResult.perUnit) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ({Number(testResult.perUnit).toLocaleString('ko-KR')}원/매)
                    </p>
                  )}
                </div>
              </div>
            </div>
            {testResult.note && (
              <p className="text-xs text-muted-foreground mt-1">{testResult.note}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
