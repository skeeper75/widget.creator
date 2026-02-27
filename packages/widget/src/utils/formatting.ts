/**
 * Formatting utilities for prices and numbers
 * Korean Won (KRW) specific formatting
 */

/**
 * Format a number as Korean Won currency
 * @param amount - Amount in KRW
 * @returns Formatted string (e.g., "1,234,567원")
 */
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * Format a number with thousand separators
 * @param value - Number to format
 * @returns Formatted string with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

/**
 * Parse a formatted number string back to number
 * @param value - Formatted string
 * @returns Parsed number
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Calculate VAT (10% in Korea)
 * @param subtotal - Subtotal amount
 * @returns VAT amount
 */
export function calculateVAT(subtotal: number): number {
  return Math.round(subtotal * 0.1);
}

/**
 * Format quantity with unit
 * @param qty - Quantity value
 * @param unit - Unit string (default: "장")
 * @returns Formatted string
 */
export function formatQuantity(qty: number, unit: string = '장'): string {
  return `${formatNumber(qty)}${unit}`;
}

/**
 * Format dimensions (width x height)
 * @param width - Width in mm
 * @param height - Height in mm
 * @returns Formatted string
 */
export function formatDimensions(width: number, height: number): string {
  return `${width} x ${height}mm`;
}

/**
 * Format percentage
 * @param value - Decimal value (0.1 = 10%)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Clamp a number within a range
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to nearest step
 * @param value - Value to round
 * @param step - Step size
 * @returns Rounded value
 */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
