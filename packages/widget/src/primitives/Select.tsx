/**
 * Select Primitive Component
 * Dropdown select component with optional chip
 * @see SPEC-WIDGET-SDK-001 Section 4.3.2
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

export interface SelectItem {
  /** Choice code */
  code: string;
  /** Display name */
  name: string;
  /** Hex color for chip display */
  chipColor?: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export interface SelectProps {
  /** Unique option key from option_definitions.key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Available choices */
  items: SelectItem[];
  /** Currently selected item code */
  value: string | null;
  /** Selection change handler */
  onChange: (code: string) => void;
  /** Layout variant */
  variant: 'default' | 'with-chip';
  /** Placeholder text */
  placeholder?: string;
  /** Whether selection is required */
  required?: boolean;
}

/**
 * Select - Dropdown select component
 *
 * Variants:
 * - default: Standard dropdown select
 * - with-chip: Dropdown with inline color chip next to selected item name
 */
export const Select: FunctionalComponent<SelectProps> = ({
  optionKey,
  label,
  items,
  value,
  onChange,
  variant = 'default',
  placeholder = '선택해주세요',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.code === value);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (code: string, disabled?: boolean) => {
      if (!disabled) {
        onChange(code);
        setIsOpen(false);
      }
    },
    [onChange]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      class={`select select--${variant}`}
      data-option-key={optionKey}
    >
      <div class="select__label">
        {label}
        {required && <span class="select__required" aria-hidden="true">*</span>}
      </div>
      <div class="select__wrapper">
        <button
          type="button"
          class={`select__trigger ${isOpen ? 'select__trigger--open' : ''}`}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {variant === 'with-chip' && selectedItem?.chipColor && (
            <span
              class="select__chip"
              style={{ backgroundColor: selectedItem.chipColor }}
              aria-hidden="true"
            />
          )}
          <span class="select__value">
            {selectedItem?.name ?? placeholder}
          </span>
          <span class="select__arrow" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
        {isOpen && (
          <ul class="select__dropdown" role="listbox">
            {items.map((item) => (
              <li
                key={item.code}
                class={`select__option ${value === item.code ? 'select__option--selected' : ''}`}
                role="option"
                aria-selected={value === item.code}
                onClick={() => handleSelect(item.code, item.disabled)}
              >
                {variant === 'with-chip' && item.chipColor && (
                  <span
                    class="select__option-chip"
                    style={{ backgroundColor: item.chipColor }}
                    aria-hidden="true"
                  />
                )}
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Select;
