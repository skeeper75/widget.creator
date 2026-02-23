/**
 * Utilities - Barrel exports
 */

export {
  dispatchWidgetEvent,
  widgetEvents,
  type WidgetEventMap,
  type WidgetLoadedEvent,
  type OptionChangedEvent,
  type QuoteCalculatedEvent,
  type AddToCartEvent,
  type FileUploadedEvent,
  type OrderSubmittedEvent,
} from './events';

export {
  createShadowContainer,
  generateCSSVariables,
  injectBaseStyles,
  createMountPoint,
  cleanupShadowDOM,
  WIDGET_CONTAINER_ID,
} from './shadow-dom';

export {
  formatKRW,
  formatNumber,
  parseNumber,
  calculateVAT,
  formatQuantity,
  formatDimensions,
  formatPercent,
  clamp,
  roundToStep,
} from './formatting';
