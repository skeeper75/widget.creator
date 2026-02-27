/**
 * ToggleGroup Primitive Component
 * Multi-button single select component
 * @see SPEC-WIDGET-SDK-001 Section 4.3.1
 */

import { FunctionalComponent } from 'preact';
import { useCallback } from 'preact/hooks';

export interface ToggleGroupItem {
  /** Choice code */
  code: string;
  /** Display name */
  name: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export interface ToggleGroupProps {
  /** Unique option key from option_definitions.key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Available choices */
  items: ToggleGroupItem[];
  /** Currently selected item code */
  value: string | null;
  /** Selection change handler */
  onChange: (code: string) => void;
  /** Layout variant */
  variant: 'default' | 'compact';
  /** Whether selection is required */
  required?: boolean;
}

/**
 * ToggleGroup - Multi-button single select component
 *
 * Variants:
 * - default: Grid wrapping layout, multi-row when items overflow
 * - compact: Inline horizontal layout, single row with overflow scroll
 */
export const ToggleGroup: FunctionalComponent<ToggleGroupProps> = ({
  optionKey,
  label,
  items,
  value,
  onChange,
  variant = 'default',
  required = false,
}) => {
  const handleClick = useCallback(
    (code: string, disabled?: boolean) => {
      if (!disabled) {
        onChange(code);
      }
    },
    [onChange]
  );

  return (
    <div
      class={`toggle-group toggle-group--${variant}`}
      role="group"
      aria-label={label}
      data-option-key={optionKey}
    >
      <div class="toggle-group__label">
        {label}
        {required && <span class="toggle-group__required" aria-hidden="true">*</span>}
      </div>
      <div class="toggle-group__items">
        {items.map((item) => {
          const isSelected = value === item.code;
          return (
            <button
              key={item.code}
              type="button"
              class={`toggle-group__item ${isSelected ? 'toggle-group__item--selected' : ''}`}
              role="button"
              aria-pressed={isSelected}
              disabled={item.disabled}
              onClick={() => handleClick(item.code, item.disabled)}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ToggleGroup;
