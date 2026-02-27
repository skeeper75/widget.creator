/**
 * RadioGroup Primitive Component
 * Radio selection with color-chip and image-chip variants
 * @see SPEC-WIDGET-SDK-001 Section 4.3.3
 */

import { FunctionalComponent } from 'preact';
import { useCallback, useId } from 'preact/hooks';

export interface RadioGroupItem {
  /** Choice code */
  code: string;
  /** Display name */
  name: string;
  /** Hex color for color-chip variant */
  color?: string;
  /** Image URL for image-chip variant */
  imageUrl?: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Unique option key from option_definitions.key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Available choices */
  items: RadioGroupItem[];
  /** Currently selected item code */
  value: string | null;
  /** Selection change handler */
  onChange: (code: string) => void;
  /** Layout variant */
  variant: 'color-chip' | 'image-chip';
  /** Whether selection is required */
  required?: boolean;
}

/**
 * RadioGroup - Radio selection component with chip variants
 *
 * Variants:
 * - color-chip: Circular color chips (50px diameter, 52px ring when selected)
 * - image-chip: Rectangular image+text cards
 */
export const RadioGroup: FunctionalComponent<RadioGroupProps> = ({
  optionKey,
  label,
  items,
  value,
  onChange,
  variant = 'color-chip',
  required = false,
}) => {
  const groupId = useId();
  const handleChange = useCallback(
    (code: string, disabled?: boolean) => {
      if (!disabled) {
        onChange(code);
      }
    },
    [onChange]
  );

  return (
    <fieldset
      class={`radio-group radio-group--${variant}`}
      data-option-key={optionKey}
    >
      <legend class="radio-group__label">
        {label}
        {required && <span class="radio-group__required" aria-hidden="true">*</span>}
      </legend>
      <div class="radio-group__items">
        {items.map((item) => {
          const itemId = `${groupId}-${item.code}`;
          const isSelected = value === item.code;

          return (
            <label
              key={item.code}
              class={`radio-group__item ${isSelected ? 'radio-group__item--selected' : ''}`}
              htmlFor={itemId}
            >
              <input
                id={itemId}
                type="radio"
                name={groupId}
                value={item.code}
                checked={isSelected}
                disabled={item.disabled}
                onChange={() => handleChange(item.code, item.disabled)}
                class="radio-group__input"
              />
              {variant === 'color-chip' && item.color && (
                <span
                  class="radio-group__color-chip"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
              )}
              {variant === 'image-chip' && item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  class="radio-group__image-chip"
                />
              )}
              <span class="radio-group__name">{item.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default RadioGroup;
