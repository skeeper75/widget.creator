'use client';

// @MX:NOTE: [AUTO] Displays GLM conversion result with confidence badge and approval controls
// @MX:SPEC: SPEC-WB-007 FR-WB007-02 FR-WB007-03

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface QtyDiscountTier {
  qtyMin: number;
  qtyMax: number | null;
  discountRate: number;
  discountLabel: string;
}

export interface ConversionResult {
  outputType: string;
  confidence: number;
  explanationKo: string;
  qtyDiscountTiers?: QtyDiscountTier[];
  constraintName?: string;
  actions?: Array<{ type: string; [key: string]: unknown }>;
}

interface ConversionPreviewProps {
  result: ConversionResult;
  onApply: () => void;
  onEdit?: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ConversionPreview({
  result,
  onApply,
  onEdit,
  onCancel,
  isApplying,
}: ConversionPreviewProps) {
  const confidence = result.confidence;
  const confidencePct = Math.round(confidence * 100);
  const isHighConfidence = confidence >= 0.85;

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">변환 결과</span>
        <div className="flex items-center gap-2">
          {isHighConfidence ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200">
              <CheckCircle className="mr-1 h-3 w-3" />
              신뢰도 {confidencePct}% · 즉시 적용 가능
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200">
              <AlertTriangle className="mr-1 h-3 w-3" />
              신뢰도 {confidencePct}% · 검토 필요
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">{result.explanationKo}</p>

      {result.outputType === 'qty_discount' && result.qtyDiscountTiers && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="border border-gray-200 dark:border-gray-700 px-3 py-1 text-left">수량구간</th>
              <th className="border border-gray-200 dark:border-gray-700 px-3 py-1 text-left">할인율</th>
              <th className="border border-gray-200 dark:border-gray-700 px-3 py-1 text-left">레이블</th>
            </tr>
          </thead>
          <tbody>
            {result.qtyDiscountTiers.map((tier, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="border border-gray-200 dark:border-gray-700 px-3 py-1">
                  {tier.qtyMin} ~ {tier.qtyMax ?? '\u221e'}
                </td>
                <td className="border border-gray-200 dark:border-gray-700 px-3 py-1">
                  {Math.round(tier.discountRate * 100)}%
                </td>
                <td className="border border-gray-200 dark:border-gray-700 px-3 py-1">
                  {tier.discountLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(result.outputType === 'single_constraint' ||
        result.outputType === 'composite_constraints') && (
        <div className="text-sm space-y-1">
          {result.constraintName && (
            <p>
              <span className="font-medium">규칙명:</span> {result.constraintName}
            </p>
          )}
          {result.actions && (
            <p>
              <span className="font-medium">액션:</span>{' '}
              {result.actions.map((a) => a.type).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          onClick={onApply}
          disabled={isApplying}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isApplying ? '적용 중...' : '적용하기'}
        </Button>
        {onEdit && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            편집 후 적용
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isApplying}
        >
          <X className="h-4 w-4 mr-1" />
          취소
        </Button>
      </div>
    </div>
  );
}
