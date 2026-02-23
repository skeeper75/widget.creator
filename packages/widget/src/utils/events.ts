/**
 * CustomEvent dispatch helpers for host communication
 * @see SPEC-WIDGET-SDK-001 Section 4.7
 */

import type { PriceBreakdownItem, ScreenType } from '../types';

/**
 * Widget loaded event payload
 */
export interface WidgetLoadedEvent {
  widgetId: string;
  productId: number;
  screenType: ScreenType;
}

/**
 * Option changed event payload
 */
export interface OptionChangedEvent {
  optionKey: string;
  oldValue: string | null;
  newValue: string;
  allSelections: Record<string, string>;
}

/**
 * Quote calculated event payload
 */
export interface QuoteCalculatedEvent {
  breakdown: PriceBreakdownItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  quantity: number;
}

/**
 * Add to cart event payload
 */
export interface AddToCartEvent {
  productId: number;
  productName: string;
  selections: Record<string, string>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail?: string;
}

/**
 * File uploaded event payload
 */
export interface FileUploadedEvent {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadId: string;
}

/**
 * Order submitted event payload
 */
export interface OrderSubmittedEvent {
  quoteId: string;
  selections: Record<string, string>;
  totalPrice: number;
}

/**
 * Event name type map for type safety
 */
export interface WidgetEventMap {
  'widget:loaded': WidgetLoadedEvent;
  'widget:option-changed': OptionChangedEvent;
  'widget:quote-calculated': QuoteCalculatedEvent;
  'widget:add-to-cart': AddToCartEvent;
  'widget:file-uploaded': FileUploadedEvent;
  'widget:order-submitted': OrderSubmittedEvent;
}

/**
 * Dispatch a custom widget event to the host page
 */
export function dispatchWidgetEvent<K extends keyof WidgetEventMap>(
  type: K,
  detail: WidgetEventMap[K]
): void {
  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: true,
  });

  document.dispatchEvent(event);
}

/**
 * Convenience dispatchers for common events
 */
export const widgetEvents = {
  loaded: (payload: WidgetLoadedEvent) =>
    dispatchWidgetEvent('widget:loaded', payload),

  optionChanged: (payload: OptionChangedEvent) =>
    dispatchWidgetEvent('widget:option-changed', payload),

  quoteCalculated: (payload: QuoteCalculatedEvent) =>
    dispatchWidgetEvent('widget:quote-calculated', payload),

  addToCart: (payload: AddToCartEvent) =>
    dispatchWidgetEvent('widget:add-to-cart', payload),

  fileUploaded: (payload: FileUploadedEvent) =>
    dispatchWidgetEvent('widget:file-uploaded', payload),

  orderSubmitted: (payload: OrderSubmittedEvent) =>
    dispatchWidgetEvent('widget:order-submitted', payload),
};
