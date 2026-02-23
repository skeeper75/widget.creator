/**
 * Input Primitive Component
 * Text/number input with variants
 * @see SPEC-WIDGET-SDK-001 Section 4.3.5
 */

import { h, FunctionalComponent } from 'preact';
import { useCallback } from 'preact/hooks';
import { clamp, roundToStep } from '../utils/formatting';

export interface InputProps {
  /** Unique option key from option_definitions.key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Current value */
  value: number | string;
  /** Value change handler */
  onChange: (value: number | string) => void;
  /** Layout variant */
  variant: 'number' | 'dual';
  /** For 'number' variant: minimum value */
  min?: number;
  /** For 'number' variant: maximum value */
  max?: number;
  /** For 'number' variant: step size */
  step?: number;
  /** For 'number' variant: unit suffix */
  unit?: string;
  /** For 'dual' variant: second value (height) */
  value2?: number;
  /** For 'dual' variant: second value change handler */
  onChange2?: (value: number) => void;
  /** For 'dual' variant: minimum for second value */
  min2?: number;
  /** For 'dual' variant: maximum for second value */
  max2?: number;
  /** For 'dual' variant: label for second input */
  label2?: string;
  /** Whether selection is required */
  required?: boolean;
}

/**
 * Input - Text/number input component
 *
 * Variants:
 * - number: Single number input with -/+ stepper buttons
 * - dual: Two number inputs side-by-side for width x height entry
 */
export const Input: FunctionalComponent<InputProps> = ({
  optionKey,
  label,
  value,
  onChange,
  variant = 'number',
  min,
  max,
  step = 1,
  unit,
  value2,
  onChange2,
  min2,
  max2,
  label2 = '높이',
  required = false,
}) => {
  const handleNumberChange = useCallback(
    (newValue: number) => {
      const clamped = clamp(newValue, min ?? -Infinity, max ?? Infinity);
      const stepped = roundToStep(clamped, step);
      onChange(stepped);
    },
    [onChange, min, max, step]
  );

  const handleInputChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value) || 0;
      if (variant === 'number') {
        handleNumberChange(newValue);
      } else {
        onChange(newValue);
      }
    },
    [handleNumberChange, onChange, variant]
  );

  const handleInput2Change = useCallback(
    (e: Event) => {
      if (onChange2) {
        const target = e.target as HTMLInputElement;
        const newValue = parseFloat(target.value) || 0;
        const clamped = clamp(newValue, min2 ?? -Infinity, max2 ?? Infinity);
        onChange2(clamped);
      }
    },
    [onChange2, min2, max2]
  );

  const handleIncrement = useCallback(() => {
    const current = typeof value === 'number' ? value : parseFloat(value) || 0;
    handleNumberChange(current + step);
  }, [value, step, handleNumberChange]);

  const handleDecrement = useCallback(() => {
    const current = typeof value === 'number' ? value : parseFloat(value) || 0;
    handleNumberChange(current - step);
  }, [value, step, handleNumberChange]);

  return (
    <div
      class={`input input--${variant}`}
      data-option-key={optionKey}
    >
      <div class="input__label">
        {label}
        {required && <span class="input__required" aria-hidden="true">*</span>}
      </div>
      {variant === 'number' && (
        <div class="input__number-wrapper">
          <button
            type="button"
            class="input__stepper"
            onClick={handleDecrement}
            aria-label="감소"
          >
            −
          </button>
          <input
            type="number"
            class="input__field"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleInputChange}
          />
          <button
            type="button"
            class="input__stepper"
            onClick={handleIncrement}
            aria-label="증가"
          >
            +
          </button>
          {unit && <span class="input__unit">{unit}</span>}
        </div>
      )}
      {variant === 'dual' && (
        <div class="input__dual-wrapper">
          <div class="input__dual-item">
            <label class="input__dual-label">너비</label>
            <input
              type="number"
              class="input__field"
              value={value}
              min={min}
              max={max}
              onChange={handleInputChange}
            />
            <span class="input__unit">mm</span>
          </div>
          <span class="input__separator">×</span>
          <div class="input__dual-item">
            <label class="input__dual-label">{label2}</label>
            <input
              type="number"
              class="input__field"
              value={value2 ?? 0}
              min={min2}
              max={max2}
              onChange={handleInput2Change}
            />
            <span class="input__unit">mm</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Input;
