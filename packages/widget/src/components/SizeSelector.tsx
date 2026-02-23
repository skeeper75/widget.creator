/**
 * SizeSelector Domain Component
 * Uses ToggleGroup for size selection
 * @see SPEC-WIDGET-SDK-001 Section 4.4.1
 */

import { h, FunctionalComponent } from 'preact';
import { ToggleGroup, type ToggleGroupItem } from '../primitives';
import type { ProductSize } from '../types';

export interface SizeSelectorProps {
  /** Product sizes for current product */
  sizes: ProductSize[];
  /** Currently selected size ID */
  selectedSizeId: number | null;
  /** Selection handler */
  onSelect: (sizeId: number) => void;
}

/**
 * SizeSelector - Size selection using ToggleGroup
 * Data source: product_sizes WHERE product_id = {current}
 */
export const SizeSelector: FunctionalComponent<SizeSelectorProps> = ({
  sizes,
  selectedSizeId,
  onSelect,
}) => {
  const items: ToggleGroupItem[] = sizes.map((size) => ({
    code: String(size.id),
    name: size.name,
    disabled: false,
  }));

  const handleChange = (code: string) => {
    onSelect(parseInt(code, 10));
  };

  return (
    <ToggleGroup
      optionKey="size"
      label="사이즈"
      items={items}
      value={selectedSizeId !== null ? String(selectedSizeId) : null}
      onChange={handleChange}
      variant="default"
      required
    />
  );
};

export default SizeSelector;
