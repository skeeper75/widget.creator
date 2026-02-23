/**
 * Embed Script - Script tag parser and container creation
 * @see SPEC-WIDGET-SDK-001 Section 4.2
 */

import type { WidgetConfig } from '../types';

/**
 * Default CDN URL
 */
const DEFAULT_CDN_URL = 'https://widget.huni.co.kr/embed.js';

/**
 * Parse embed script attributes to get widget configuration
 */
export function parseScriptAttributes(): WidgetConfig | null {
  // Find the current script tag
  const scripts = document.querySelectorAll('script[src*="embed.js"]');
  const currentScript = scripts[scripts.length - 1] as HTMLScriptElement | undefined;

  if (!currentScript) {
    console.error('[HuniWidget] Could not find embed script tag');
    return null;
  }

  // Parse required attributes
  const widgetId = currentScript.dataset.widgetId;
  const productId = currentScript.dataset.productId;

  if (!widgetId || !productId) {
    console.error('[HuniWidget] Missing required attributes: data-widget-id, data-product-id');
    return null;
  }

  // Build configuration
  const config: WidgetConfig = {
    widgetId,
    productId: parseInt(productId, 10),
  };

  // Parse optional theme overrides
  if (currentScript.dataset.themePrimary) {
    config.themePrimary = currentScript.dataset.themePrimary;
  }

  if (currentScript.dataset.themeRadius) {
    config.themeRadius = currentScript.dataset.themeRadius;
  }

  if (currentScript.dataset.locale) {
    config.locale = currentScript.dataset.locale;
  }

  return config;
}

/**
 * Widget API base URL
 */
export function getApiBaseUrl(): string {
  // In production, use the configured API URL
  // In development, use relative or localhost
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
  }
  return 'https://api.huni.co.kr';
}

/**
 * Generate API URL for product config
 */
export function getProductConfigUrl(config: WidgetConfig): string {
  return `${getApiBaseUrl()}/widget/${config.widgetId}/product/${config.productId}`;
}

export default {
  parseScriptAttributes,
  getApiBaseUrl,
  getProductConfigUrl,
};
