/**
 * QuantitySlider Domain Component
 * Uses Slider for quantity selection with tier pricing
 * @see SPEC-WIDGET-SDK-001 Section 4.4.8
 */

import { h, FunctionalComponent } from 'preact';
import { Slider, type SliderTier } from '../primitives';

export interface QuantityTier {
  /** Minimum quantity */
  minQty: number;
  /** Maximum quantity */
  maxQty: number;
  /** Unit price at this tier */
  unitPrice: number;
}

export interface QuantitySliderProps {
  /** Current quantity value */
  value: number;
  /** Quantity change handler */
  onChange: (qty: number) => void;
  /** Tier pricing data from price_tiers */
  tiers: QuantityTier[];
}

/**
 * QuantitySlider - Quantity selection with tier pricing
 * Renders: Slider(variant='tier-display')
 * Data source: price_tiers or quantity_discount_rules
 * Shows unit price overlay at each discrete tier step
 */
export const QuantitySlider: FunctionalComponent<QuantitySliderProps> = ({
  value,
  onChange,
  tiers,
}) => {
  // Convert QuantityTier to SliderTier format
  const sliderTiers: SliderTier[] = tiers.map((tier, index) => ({
    qty: tier.minQty,
    unitPrice: tier.unitPrice,
    label: tier.maxQty
      ? `${tier.minQty}~${tier.maxQty}개`
      : `${tier.minQty}개 이상`,
  }));

  return (
    <Slider
      optionKey="quantity"
      label="수량 구간 선택"
      value={value}
      onChange={onChange}
      variant="tier-display"
      tiers={sliderTiers}
      showPriceOverlay
    />
  );
};

export default QuantitySlider;
