// Quote assembly (REQ-QUOTE-001)

import type { PriceBreakdown, SelectedOption, SizeSelection } from '../pricing/types.js';
import { computeSnapshotHash } from './snapshot.js';
import type { LineItemCategory, QuoteInput, QuoteLineItem, QuoteResult } from './types.js';

const BREAKDOWN_TO_CATEGORY: Record<keyof PriceBreakdown, LineItemCategory> = {
  printCost: 'print',
  paperCost: 'paper',
  specialColorCost: 'special_color',
  coatingCost: 'coating',
  postProcessCost: 'post_process',
  bindingCost: 'binding',
  foilCost: 'foil',
  packagingCost: 'packaging',
  cuttingCost: 'cutting',
  discountAmount: 'discount',
};

const BREAKDOWN_LABELS: Record<keyof PriceBreakdown, string> = {
  printCost: 'Print Cost',
  paperCost: 'Paper Cost',
  specialColorCost: 'Special Color Cost',
  coatingCost: 'Coating Cost',
  postProcessCost: 'Post Process Cost',
  bindingCost: 'Binding Cost',
  foilCost: 'Foil / Emboss Cost',
  packagingCost: 'Packaging Cost',
  cuttingCost: 'Cutting Cost',
  discountAmount: 'Discount',
};

export function buildLineItems(breakdown: PriceBreakdown): QuoteLineItem[] {
  const items: QuoteLineItem[] = [];

  for (const [key, amount] of Object.entries(breakdown)) {
    if (amount === 0) continue;

    const breakdownKey = key as keyof PriceBreakdown;
    items.push({
      category: BREAKDOWN_TO_CATEGORY[breakdownKey],
      label: BREAKDOWN_LABELS[breakdownKey],
      description: BREAKDOWN_LABELS[breakdownKey],
      unitPrice: amount,
      quantity: 1,
      amount,
    });
  }

  return items;
}

export function formatSizeDisplay(size: SizeSelection): string {
  if (size.isCustom) {
    return `${size.customWidth} x ${size.customHeight} mm`;
  }
  return `${size.cutWidth} x ${size.cutHeight} mm`;
}

export function buildOptionSummary(selectedOptions: SelectedOption[]): string {
  return selectedOptions.map(o => o.choiceCode).join(', ');
}

export async function assembleQuote(input: QuoteInput): Promise<QuoteResult> {
  const { pricingResult, selectedOptions, quantity } = input;
  const lineItems = buildLineItems(pricingResult.breakdown);

  const subtotal = pricingResult.totalPrice;
  const vatAmount = Math.floor(subtotal * 0.1);
  const totalPrice = subtotal + vatAmount;
  const unitPrice = Math.floor(subtotal / quantity);

  const createdAt = Date.now();
  const expiresAt = createdAt + 30 * 60 * 1000;
  const snapshotHash = await computeSnapshotHash(input);

  return {
    quoteId: crypto.randomUUID(),
    productId: input.productId,
    productName: input.productName,
    lineItems,
    subtotal,
    vatAmount,
    totalPrice,
    unitPrice,
    quantity,
    sizeDisplay: formatSizeDisplay(input.sizeSelection),
    optionSummary: buildOptionSummary(selectedOptions),
    createdAt,
    expiresAt,
    snapshotHash,
  };
}
