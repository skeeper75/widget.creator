// Quote calculator type definitions (REQ-QUOTE-001)

import type { PricingResult, SelectedOption, SizeSelection } from '../pricing/types.js';

export interface QuoteInput {
  productId: number;
  productName: string;
  pricingResult: PricingResult;
  selectedOptions: SelectedOption[];
  quantity: number;
  sizeSelection: SizeSelection;
}

export interface QuoteResult {
  quoteId: string;
  productId: number;
  productName: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  vatAmount: number;
  totalPrice: number;
  unitPrice: number;
  quantity: number;
  sizeDisplay: string;
  optionSummary: string;
  createdAt: number;
  expiresAt: number;
  snapshotHash: string;
}

export interface QuoteLineItem {
  category: LineItemCategory;
  label: string;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export type LineItemCategory =
  | 'print'
  | 'paper'
  | 'special_color'
  | 'coating'
  | 'post_process'
  | 'binding'
  | 'foil'
  | 'packaging'
  | 'accessory'
  | 'cutting'
  | 'discount';
