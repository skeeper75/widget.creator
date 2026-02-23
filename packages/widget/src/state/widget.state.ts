/**
 * Widget State - Core widget state signals
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

import { signal, computed } from '@preact/signals';
import type { WidgetStatus, ScreenType, WidgetConfig, WidgetState } from '../types';

/**
 * Widget configuration signal (set once at initialization)
 */
export const widgetConfig = signal<WidgetConfig>({
  widgetId: '',
  productId: 0,
});

/**
 * Core widget state signal
 */
export const widgetState = signal<WidgetState>({
  productId: 0,
  screenType: 'PRINT_OPTION',
  status: 'idle',
});

/**
 * Computed: Is widget in a ready/interactive state
 */
export const isReady = computed(() => {
  const status = widgetState.value.status;
  return status === 'ready' || status === 'selecting' || status === 'complete';
});

/**
 * Computed: Is widget in a loading state
 */
export const isLoading = computed(() => {
  const status = widgetState.value.status;
  return status === 'idle' || status === 'loading';
});

/**
 * Computed: Is widget in an error state
 */
export const hasError = computed(() => {
  return widgetState.value.status === 'error';
});

/**
 * Initialize widget state with configuration
 */
export function initWidgetState(config: WidgetConfig, screenType: ScreenType): void {
  widgetConfig.value = config;
  widgetState.value = {
    productId: config.productId,
    screenType,
    status: 'loading',
  };
}

/**
 * Set widget status
 */
export function setWidgetStatus(status: WidgetStatus): void {
  widgetState.value = {
    ...widgetState.value,
    status,
  };
}

/**
 * Set screen type (when product changes)
 */
export function setScreenType(screenType: ScreenType): void {
  widgetState.value = {
    ...widgetState.value,
    screenType,
  };
}
