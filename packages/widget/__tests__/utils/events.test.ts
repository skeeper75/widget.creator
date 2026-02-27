/**
 * Event Utilities Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dispatchWidgetEvent,
  widgetEvents,
} from '@/utils/events';

describe('events utils', () => {
  let eventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eventListener = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('dispatchWidgetEvent', () => {
    it('dispatches widget:loaded event with correct detail', () => {
      document.addEventListener('widget:loaded', eventListener);

      dispatchWidgetEvent('widget:loaded', {
        widgetId: 'wgt_123',
        productId: 42,
        screenType: 'PRINT_OPTION',
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail).toEqual({
        widgetId: 'wgt_123',
        productId: 42,
        screenType: 'PRINT_OPTION',
      });

      document.removeEventListener('widget:loaded', eventListener);
    });

    it('dispatches widget:option-changed event', () => {
      document.addEventListener('widget:option-changed', eventListener);

      dispatchWidgetEvent('widget:option-changed', {
        optionKey: 'print_type',
        oldValue: 'single',
        newValue: 'double',
        allSelections: { print_type: 'double' },
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.optionKey).toBe('print_type');
      expect(event.detail.oldValue).toBe('single');
      expect(event.detail.newValue).toBe('double');

      document.removeEventListener('widget:option-changed', eventListener);
    });

    it('dispatches widget:quote-calculated event', () => {
      document.addEventListener('widget:quote-calculated', eventListener);

      const breakdown = [
        { label: '기본 요금', amount: 50000 },
        { label: '후가공', amount: 5000 },
      ];

      dispatchWidgetEvent('widget:quote-calculated', {
        breakdown,
        subtotal: 55000,
        vatAmount: 5500,
        total: 60500,
        quantity: 100,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.total).toBe(60500);
      expect(event.detail.quantity).toBe(100);

      document.removeEventListener('widget:quote-calculated', eventListener);
    });

    it('dispatches widget:add-to-cart event', () => {
      document.addEventListener('widget:add-to-cart', eventListener);

      dispatchWidgetEvent('widget:add-to-cart', {
        productId: 1,
        productName: '명함',
        selections: { print_type: 'double' },
        quantity: 100,
        unitPrice: 100,
        totalPrice: 10000,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.productId).toBe(1);
      expect(event.detail.productName).toBe('명함');

      document.removeEventListener('widget:add-to-cart', eventListener);
    });

    it('dispatches widget:file-uploaded event', () => {
      document.addEventListener('widget:file-uploaded', eventListener);

      dispatchWidgetEvent('widget:file-uploaded', {
        fileName: 'design.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        uploadId: 'up_123',
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.fileName).toBe('design.pdf');

      document.removeEventListener('widget:file-uploaded', eventListener);
    });

    it('dispatches widget:order-submitted event', () => {
      document.addEventListener('widget:order-submitted', eventListener);

      dispatchWidgetEvent('widget:order-submitted', {
        quoteId: 'quote_123',
        selections: { print_type: 'double' },
        totalPrice: 60500,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.quoteId).toBe('quote_123');

      document.removeEventListener('widget:order-submitted', eventListener);
    });

    it('creates event that bubbles', () => {
      document.addEventListener('widget:loaded', eventListener);

      dispatchWidgetEvent('widget:loaded', {
        widgetId: 'wgt_123',
        productId: 1,
        screenType: 'PRINT_OPTION',
      });

      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.bubbles).toBe(true);

      document.removeEventListener('widget:loaded', eventListener);
    });

    it('creates cancelable event', () => {
      document.addEventListener('widget:loaded', eventListener);

      dispatchWidgetEvent('widget:loaded', {
        widgetId: 'wgt_123',
        productId: 1,
        screenType: 'PRINT_OPTION',
      });

      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.cancelable).toBe(true);

      document.removeEventListener('widget:loaded', eventListener);
    });
  });

  describe('widgetEvents convenience helpers', () => {
    it('widgetEvents.loaded dispatches widget:loaded event', () => {
      document.addEventListener('widget:loaded', eventListener);

      widgetEvents.loaded({
        widgetId: 'wgt_456',
        productId: 99,
        screenType: 'BOOK_OPTION',
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.widgetId).toBe('wgt_456');

      document.removeEventListener('widget:loaded', eventListener);
    });

    it('widgetEvents.optionChanged dispatches widget:option-changed event', () => {
      document.addEventListener('widget:option-changed', eventListener);

      widgetEvents.optionChanged({
        optionKey: 'paper',
        oldValue: 'standard',
        newValue: 'premium',
        allSelections: { paper: 'premium' },
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.optionKey).toBe('paper');

      document.removeEventListener('widget:option-changed', eventListener);
    });

    it('widgetEvents.quoteCalculated dispatches widget:quote-calculated event', () => {
      document.addEventListener('widget:quote-calculated', eventListener);

      widgetEvents.quoteCalculated({
        breakdown: [],
        subtotal: 100000,
        vatAmount: 10000,
        total: 110000,
        quantity: 500,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.total).toBe(110000);

      document.removeEventListener('widget:quote-calculated', eventListener);
    });

    it('widgetEvents.addToCart dispatches widget:add-to-cart event', () => {
      document.addEventListener('widget:add-to-cart', eventListener);

      widgetEvents.addToCart({
        productId: 5,
        productName: '전단지',
        selections: {},
        quantity: 1000,
        unitPrice: 50,
        totalPrice: 50000,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.productName).toBe('전단지');

      document.removeEventListener('widget:add-to-cart', eventListener);
    });

    it('widgetEvents.fileUploaded dispatches widget:file-uploaded event', () => {
      document.addEventListener('widget:file-uploaded', eventListener);

      widgetEvents.fileUploaded({
        fileName: 'artwork.ai',
        fileSize: 2048,
        fileType: 'application/illustrator',
        uploadId: 'up_789',
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.fileName).toBe('artwork.ai');

      document.removeEventListener('widget:file-uploaded', eventListener);
    });

    it('widgetEvents.orderSubmitted dispatches widget:order-submitted event', () => {
      document.addEventListener('widget:order-submitted', eventListener);

      widgetEvents.orderSubmitted({
        quoteId: 'quote_xyz',
        selections: {},
        totalPrice: 99000,
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      const event = eventListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.quoteId).toBe('quote_xyz');

      document.removeEventListener('widget:order-submitted', eventListener);
    });
  });
});
