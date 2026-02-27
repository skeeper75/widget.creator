/**
 * Shadow DOM creation and styling helpers
 * @see SPEC-WIDGET-SDK-001 Section 4.2.2
 */

import type { WidgetConfig, DesignTokens } from '../types';
import { DEFAULT_DESIGN_TOKENS } from '../types';

/**
 * Widget container ID
 */
export const WIDGET_CONTAINER_ID = 'huni-widget-root';

/**
 * Create the Shadow DOM container and attach shadow root
 */
export function createShadowContainer(
  _config: WidgetConfig
): { container: HTMLDivElement; shadowRoot: ShadowRoot } {
  // Check if container already exists
  let container = document.getElementById(WIDGET_CONTAINER_ID) as HTMLDivElement | null;

  if (!container) {
    container = document.createElement('div');
    container.id = WIDGET_CONTAINER_ID;
    document.body.appendChild(container);
  }

  // Attach shadow DOM if not already attached
  let shadowRoot: ShadowRoot;
  if (container.shadowRoot) {
    shadowRoot = container.shadowRoot;
  } else {
    shadowRoot = container.attachShadow({ mode: 'open' });
  }

  return { container, shadowRoot };
}

/**
 * Generate CSS Custom Properties from design tokens and config overrides
 */
export function generateCSSVariables(
  config: WidgetConfig,
  baseTokens: DesignTokens = DEFAULT_DESIGN_TOKENS
): string {
  const primary = config.themePrimary ?? baseTokens.colors.primary;
  const radius = config.themeRadius ?? baseTokens.borderRadius.default;

  return `
    --widget-color-primary: ${primary};
    --widget-color-secondary: ${baseTokens.colors.secondary};
    --widget-color-accent: ${baseTokens.colors.accent};
    --widget-color-text-primary: ${baseTokens.colors.textPrimary};
    --widget-color-text-secondary: ${baseTokens.colors.textSecondary};
    --widget-color-text-tertiary: ${baseTokens.colors.textTertiary};
    --widget-color-border: ${baseTokens.colors.border};
    --widget-color-disabled: ${baseTokens.colors.disabled};
    --widget-color-surface: ${baseTokens.colors.surface};
    --widget-color-background: ${baseTokens.colors.background};

    --widget-font-family: ${baseTokens.typography.fontFamily};
    --widget-font-size-base: ${baseTokens.typography.baseSize};
    --widget-font-weight-regular: ${baseTokens.typography.weights.regular};
    --widget-font-weight-medium: ${baseTokens.typography.weights.medium};
    --widget-font-weight-semibold: ${baseTokens.typography.weights.semibold};
    --widget-font-weight-bold: ${baseTokens.typography.weights.bold};

    --widget-spacing-unit: ${baseTokens.spacing.unit}px;

    --widget-radius-default: ${radius};
    --widget-radius-chip: ${baseTokens.borderRadius.chip};
    --widget-radius-small: ${baseTokens.borderRadius.small};

    --widget-chip-diameter: ${baseTokens.components.colorChip.diameter};
    --widget-chip-ring: ${baseTokens.components.colorChip.selectedRing};
  `;
}

/**
 * Inject base styles into shadow root
 */
export function injectBaseStyles(shadowRoot: ShadowRoot, cssVariables: string): void {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    :host {
      all: initial;
      font-family: var(--widget-font-family);
      font-size: var(--widget-font-size-base);
      color: var(--widget-color-text-primary);
      box-sizing: border-box;
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: inherit;
    }

    :host {
      ${cssVariables}
    }
  `;
  shadowRoot.appendChild(styleElement);
}

/**
 * Mount point for Preact app within shadow root
 */
export function createMountPoint(shadowRoot: ShadowRoot): HTMLDivElement {
  const mountPoint = document.createElement('div');
  mountPoint.id = 'widget-mount';
  mountPoint.style.cssText = 'width: 100%; min-height: 200px;';
  shadowRoot.appendChild(mountPoint);
  return mountPoint;
}

/**
 * Clean up shadow DOM
 */
export function cleanupShadowDOM(): void {
  const container = document.getElementById(WIDGET_CONTAINER_ID);
  if (container) {
    container.remove();
  }
}
