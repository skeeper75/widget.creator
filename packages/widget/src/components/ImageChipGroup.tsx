/**
 * ImageChipGroup Domain Component
 * Uses RadioGroup for image chip selection
 * @see SPEC-WIDGET-SDK-001 Section 4.4.5
 */

import { h, FunctionalComponent } from 'preact';
import { RadioGroup, type RadioGroupItem } from '../primitives';

export interface ImageChipChoice {
  /** Choice ID */
  id: number;
  /** Choice code */
  code: string;
  /** Display name */
  name: string;
  /** Image URL */
  imageUrl: string;
}

export interface ImageChipGroupProps {
  /** Option key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Available choices with image URLs */
  choices: ImageChipChoice[];
  /** Currently selected code */
  selectedCode: string | null;
  /** Selection handler */
  onSelect: (code: string) => void;
}

/**
 * ImageChipGroup - Image chip selection using RadioGroup
 * Renders: RadioGroup(variant='image-chip')
 * Data source: option_choices WHERE ref_* fields provide image references
 */
export const ImageChipGroup: FunctionalComponent<ImageChipGroupProps> = ({
  optionKey,
  label,
  choices,
  selectedCode,
  onSelect,
}) => {
  const items: RadioGroupItem[] = choices.map((choice) => ({
    code: choice.code,
    name: choice.name,
    imageUrl: choice.imageUrl,
    disabled: false,
  }));

  return (
    <RadioGroup
      optionKey={optionKey}
      label={label}
      items={items}
      value={selectedCode}
      onChange={onSelect}
      variant="image-chip"
      required
    />
  );
};

export default ImageChipGroup;
