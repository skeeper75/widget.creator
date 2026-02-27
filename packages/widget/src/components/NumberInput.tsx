/**
 * NumberInput Domain Component
 * Uses Input for numeric entry with constraints
 * @see SPEC-WIDGET-SDK-001 Section 4.4.3
 */

import { FunctionalComponent } from 'preact';
import { Input } from '../primitives';

export interface NumberConstraints {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step size */
  step: number;
}

export interface NumberInputProps {
  /** Option key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Current value */
  value: number;
  /** Value change handler */
  onChange: (value: number) => void;
  /** Constraints from product_options + option_constraints */
  constraints: NumberConstraints;
  /** Optional unit suffix */
  unit?: string;
}

/**
 * NumberInput - Numeric input with constraints
 * Renders: Input(variant='number')
 * Data source: product_options constraints (min/max/step)
 */
export const NumberInput: FunctionalComponent<NumberInputProps> = ({
  optionKey,
  label,
  value,
  onChange,
  constraints,
  unit,
}) => {
  return (
    <Input
      optionKey={optionKey}
      label={label}
      value={value}
      onChange={(v) => onChange(typeof v === 'number' ? v : parseFloat(v) || 0)}
      variant="number"
      min={constraints.min}
      max={constraints.max}
      step={constraints.step}
      unit={unit}
      required
    />
  );
};

export default NumberInput;
