/**
 * PriceSummary Domain Component
 * Custom price display with breakdown
 * @see SPEC-WIDGET-SDK-001 Section 4.4.9
 */

import { FunctionalComponent } from 'preact';
import { formatKRW } from '../utils/formatting';
import type { PriceBreakdownItem } from '../types';

export interface PriceSummaryProps {
  /** Itemized price breakdown */
  breakdown: PriceBreakdownItem[];
  /** Subtotal before VAT */
  total: number;
  /** VAT amount */
  vatAmount: number;
  /** Whether calculation is in progress */
  isCalculating: boolean;
}

/**
 * PriceSummary - Price breakdown display
 * Renders: Custom list component
 * Data source: quote engine calculation results
 * Shows itemized price breakdown + total with VAT
 */
export const PriceSummary: FunctionalComponent<PriceSummaryProps> = ({
  breakdown,
  total,
  vatAmount,
  isCalculating,
}) => {
  const grandTotal = total + vatAmount;

  return (
    <div class="price-summary">
      <div class="price-summary__title">견적 요약</div>

      {isCalculating ? (
        <div class="price-summary__loading">
          <span class="price-summary__spinner" />
          가격 계산 중...
        </div>
      ) : (
        <>
          <ul class="price-summary__breakdown">
            {breakdown.map((item, index) => (
              <li key={index} class="price-summary__item">
                <span class="price-summary__item-label">{item.label}</span>
                {item.detail && (
                  <span class="price-summary__item-detail">{item.detail}</span>
                )}
                <span class="price-summary__item-amount">
                  {formatKRW(item.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div class="price-summary__divider" />

          <div class="price-summary__row">
            <span>소계</span>
            <span>{formatKRW(total)}</span>
          </div>

          <div class="price-summary__row">
            <span>VAT (10%)</span>
            <span>{formatKRW(vatAmount)}</span>
          </div>

          <div class="price-summary__total">
            <span>총 금액</span>
            <span class="price-summary__total-amount">
              {formatKRW(grandTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceSummary;
