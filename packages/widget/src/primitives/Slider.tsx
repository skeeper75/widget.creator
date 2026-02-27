/**
 * Slider Primitive Component
 * Range slider with tier display
 * @see SPEC-WIDGET-SDK-001 Section 4.3.6
 */

import { FunctionalComponent } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import { formatKRW } from '../utils/formatting';

export interface SliderTier {
  /** Quantity at this tier */
  qty: number;
  /** Unit price at this tier */
  unitPrice: number;
  /** Display label for tier */
  label?: string;
}

export interface SliderProps {
  /** Unique option key from option_definitions.key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Current value */
  value: number;
  /** Value change handler */
  onChange: (value: number) => void;
  /** Layout variant */
  variant: 'tier-display';
  /** Discrete tier steps */
  tiers: SliderTier[];
  /** Whether to show price overlay at each tier */
  showPriceOverlay?: boolean;
}

/**
 * Slider - Range slider component with tier display
 *
 * Variants:
 * - tier-display: Discrete step slider with tier labels and price overlay at each step
 */
export const Slider: FunctionalComponent<SliderProps> = ({
  optionKey,
  label,
  value,
  onChange,
  variant = 'tier-display',
  tiers,
  showPriceOverlay = true,
}) => {
  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.qty - b.qty),
    [tiers]
  );

  const currentIndex = useMemo(() => {
    const idx = sortedTiers.findIndex((tier) => tier.qty === value);
    return idx >= 0 ? idx : 0;
  }, [sortedTiers, value]);

  const handleSliderChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const index = parseInt(target.value, 10);
      const selectedTier = sortedTiers[index];
      if (selectedTier) {
        onChange(selectedTier.qty);
      }
    },
    [sortedTiers, onChange]
  );

  const currentTier = sortedTiers[currentIndex];

  return (
    <div
      class={`slider slider--${variant}`}
      data-option-key={optionKey}
    >
      <div class="slider__label">{label}</div>
      <div class="slider__wrapper">
        <input
          type="range"
          class="slider__input"
          min={0}
          max={sortedTiers.length - 1}
          value={currentIndex}
          step={1}
          onChange={handleSliderChange}
        />
        <div class="slider__tiers">
          {sortedTiers.map((tier, index) => (
            <div
              key={tier.qty}
              class={`slider__tier ${index === currentIndex ? 'slider__tier--active' : ''}`}
            >
              <span class="slider__tier-qty">
                {tier.label ?? `${tier.qty}개`}
              </span>
              {showPriceOverlay && (
                <span class="slider__tier-price">
                  {formatKRW(tier.unitPrice)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {currentTier && (
        <div class="slider__current">
          선택: {currentTier.label ?? `${currentTier.qty}개`}
          {showPriceOverlay && ` (${formatKRW(currentTier.unitPrice)}/개)`}
        </div>
      )}
    </div>
  );
};

export default Slider;
