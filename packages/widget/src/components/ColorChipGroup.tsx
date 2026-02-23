/**
 * ColorChipGroup Domain Component
 * Uses RadioGroup for color chip selection
 * @see SPEC-WIDGET-SDK-001 Section 4.4.4
 */

import { h, FunctionalComponent } from 'preact';
import { RadioGroup, type RadioGroupItem } from '../primitives';

export interface ColorChipChoice {
  /** Choice ID */
  id: number;
  /** Choice code */
  code: string;
  /** Display name */
  name: string;
  /** Color hex value */
  color: string;
}

export interface ColorChipGroupProps {
  /** Option key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Available choices with color values */
  choices: ColorChipChoice[];
  /** Currently selected code */
  selectedCode: string | null;
  /** Selection handler */
  onSelect: (code: string) => void;
}

/**
 * ColorChipGroup - Color chip selection using RadioGroup
 * Renders: RadioGroup(variant='color-chip')
 * Data source: option_choices WHERE ref_paper_id or ref_material_id IS NOT NULL
 */
export const ColorChipGroup: FunctionalComponent<ColorChipGroupProps> = ({
  optionKey,
  label,
  choices,
  selectedCode,
  onSelect,
}) => {
  const items: RadioGroupItem[] = choices.map((choice) => ({
    code: choice.code,
    name: choice.name,
    color: choice.color,
    disabled: false,
  }));

  return (
    <RadioGroup
      optionKey={optionKey}
      label={label}
      items={items}
      value={selectedCode}
      onChange={onSelect}
      variant="color-chip"
      required
    />
  );
};

export default ColorChipGroup;
