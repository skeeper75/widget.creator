/**
 * AccessoryOption Screen Configuration (Simplified example)
 * @see SPEC-WIDGET-SDK-001 Section 4.5 Screen 11
 */

import { FunctionalComponent } from 'preact';
import {
  SizeSelector,
  NumberInput,
  PriceSummary,
  UploadActions,
} from '../components';
import type { ProductSize } from '../types';

export interface AccessoryOptionProps {
  sizes: ProductSize[];
  selectedSizeId: number | null;
  quantity: number;
  priceBreakdown: { label: string; amount: number }[];
  priceTotal: number;
  priceVat: number;
  isCalculating: boolean;
  isComplete: boolean;
  onSizeSelect: (id: number) => void;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
}

/**
 * Screen 11: ACCESSORY_OPTION
 * SizeSelector -> NumberInput (수량) -> PriceSummary -> UploadActions (cart-only)
 */
export const AccessoryOption: FunctionalComponent<AccessoryOptionProps> = ({
  sizes,
  selectedSizeId,
  quantity,
  priceBreakdown,
  priceTotal,
  priceVat,
  isCalculating,
  isComplete,
  onSizeSelect,
  onQuantityChange,
  onAddToCart,
}) => {
  return (
    <div class="screen screen--accessory-option">
      <SizeSelector
        sizes={sizes}
        selectedSizeId={selectedSizeId}
        onSelect={onSizeSelect}
      />

      <NumberInput
        optionKey="quantity"
        label="수량"
        value={quantity}
        onChange={onQuantityChange}
        constraints={{ min: 1, max: 1000, step: 1 }}
        unit="개"
      />

      <PriceSummary
        breakdown={priceBreakdown}
        total={priceTotal}
        vatAmount={priceVat}
        isCalculating={isCalculating}
      />

      <UploadActions
        variant="cart-only"
        onUpload={() => {}}
        onEditor={() => {}}
        onAddToCart={onAddToCart}
        onOrder={() => {}}
        disabled={!isComplete}
      />
    </div>
  );
};

export default AccessoryOption;
