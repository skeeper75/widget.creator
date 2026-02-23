/**
 * Price State - Price computation signals
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

import { signal, computed } from '@preact/signals';
import { widgetEvents } from '../utils/events';
import { calculateVAT } from '../utils/formatting';
import type { PriceBreakdownItem, PriceState, PriceTier } from '../types';
import { selections } from './selections.state';

/**
 * Base price tiers (loaded from API)
 */
export const priceTiers = signal<PriceTier[]>([]);

/**
 * Price state signal
 */
export const price = signal<PriceState>({
  breakdown: [],
  subtotal: 0,
  vatAmount: 0,
  total: 0,
  isCalculating: false,
});

/**
 * Computed: Grand total including VAT
 */
export const grandTotal = computed(() => {
  const p = price.value;
  return p.subtotal + p.vatAmount;
});

/**
 * Computed: Unit price for current quantity
 */
export const currentUnitPrice = computed(() => {
  const qty = selections.value.quantity;
  const tiers = priceTiers.value;

  // Find the applicable tier
  for (const tier of tiers) {
    if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) {
      return tier.unitPrice;
    }
  }

  // Default to highest tier if quantity exceeds all
  if (tiers.length > 0) {
    return tiers[tiers.length - 1]?.unitPrice ?? 0;
  }

  return 0;
});

/**
 * Computed: Line total (unit price * quantity)
 */
export const lineTotal = computed(() => {
  return currentUnitPrice.value * selections.value.quantity;
});

/**
 * Set price calculation loading state
 */
export function setPriceCalculating(isCalculating: boolean): void {
  price.value = {
    ...price.value,
    isCalculating,
  };
}

/**
 * Update price state
 */
export function updatePrice(breakdown: PriceBreakdownItem[], subtotal: number): void {
  const vatAmount = calculateVAT(subtotal);

  price.value = {
    breakdown,
    subtotal,
    vatAmount,
    total: subtotal,
    isCalculating: false,
  };

  // Dispatch quote calculated event
  widgetEvents.quoteCalculated({
    breakdown,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    quantity: selections.value.quantity,
  });
}

/**
 * Set price tiers from API data
 */
export function setPriceTiers(tiers: PriceTier[]): void {
  priceTiers.value = [...tiers].sort((a, b) => a.minQty - b.minQty);
}

/**
 * Calculate and update price (client-side)
 */
export function calculatePrice(basePrice: number, options: { label: string; amount: number }[]): void {
  const breakdown: PriceBreakdownItem[] = [];

  // Base price
  breakdown.push({
    label: '기본 가격',
    amount: basePrice,
  });

  // Add options
  for (const opt of options) {
    breakdown.push({
      label: opt.label,
      amount: opt.amount,
    });
  }

  const subtotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
  updatePrice(breakdown, subtotal);
}
