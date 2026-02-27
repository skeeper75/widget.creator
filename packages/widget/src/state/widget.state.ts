/**
 * Widget State - Core widget state signals
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

import { signal, computed } from '@preact/signals';
import type { WidgetStatus, ScreenType, WidgetConfig, WidgetState } from '../types';

// @MX:WARN: [AUTO] Module-level Preact signals are shared global state across all widget instances on the same page
// @MX:REASON: widgetConfig and widgetState are singleton signals; embedding multiple widgets will cause state collisions — see SPEC-WIDGET-SDK-001 single-instance constraint
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

// @MX:ANCHOR: [AUTO] Widget lifecycle initializer - must be called once before any other state mutations
// @MX:REASON: Sets both widgetConfig and widgetState atomically; calling after initialization resets productId and screenType, breaking in-flight operations
export function initWidgetState(config: WidgetConfig, screenType: ScreenType): void {
  widgetConfig.value = config;
  widgetState.value = {
    productId: config.productId,
    screenType,
    status: 'loading',
  };
}

// @MX:ANCHOR: [AUTO] Widget status mutation - called from app.tsx, index.tsx, and error recovery paths (fan_in >= 3)
// @MX:REASON: All rendering branches gate on widgetState.status; out-of-order calls (e.g., 'ready' before data loaded) will expose incomplete UI
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
