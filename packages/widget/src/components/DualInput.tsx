/**
 * DualInput Domain Component
 * Uses Input for width x height entry
 * @see SPEC-WIDGET-SDK-001 Section 4.4.7
 */

import { FunctionalComponent } from 'preact';
import { Input } from '../primitives';

export interface DualConstraints {
  /** Minimum width */
  minW: number;
  /** Maximum width */
  maxW: number;
  /** Minimum height */
  minH: number;
  /** Maximum height */
  maxH: number;
}

export interface DualInputProps {
  /** Option key */
  optionKey: string;
  /** Display label */
  label: string;
  /** Width value */
  width: number;
  /** Height value */
  height: number;
  /** Width change handler */
  onWidthChange: (value: number) => void;
  /** Height change handler */
  onHeightChange: (value: number) => void;
  /** Size constraints */
  constraints: DualConstraints;
}

/**
 * DualInput - Width x Height input
 * Renders: Input(variant='dual')
 * Data source: product_sizes WHERE is_custom = true (customMinW, customMaxW, customMinH, customMaxH)
 */
export const DualInput: FunctionalComponent<DualInputProps> = ({
  optionKey,
  label,
  width,
  height,
  onWidthChange,
  onHeightChange,
  constraints,
}) => {
  return (
    <Input
      optionKey={optionKey}
      label={label}
      value={width}
      onChange={(v) => onWidthChange(typeof v === 'number' ? v : parseFloat(v) || 0)}
      variant="dual"
      min={constraints.minW}
      max={constraints.maxW}
      value2={height}
      onChange2={onHeightChange}
      min2={constraints.minH}
      max2={constraints.maxH}
      label2="높이"
      required
    />
  );
};

export default DualInput;
