/**
 * Shadow DOM Utilities Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.2.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createShadowContainer,
  generateCSSVariables,
  injectBaseStyles,
  createMountPoint,
  cleanupShadowDOM,
  WIDGET_CONTAINER_ID,
} from '@/utils/shadow-dom';
import { DEFAULT_DESIGN_TOKENS, type WidgetConfig } from '@/types';

describe('shadow-dom utils', () => {
  beforeEach(() => {
    // Clean up any existing container
    const existing = document.getElementById(WIDGET_CONTAINER_ID);
    if (existing) {
      existing.remove();
    }
  });

  afterEach(() => {
    // Clean up after each test
    cleanupShadowDOM();
  });

  describe('createShadowContainer', () => {
    it('creates container with correct ID', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const { container } = createShadowContainer(config);

      expect(container.id).toBe(WIDGET_CONTAINER_ID);
      expect(document.getElementById(WIDGET_CONTAINER_ID)).toBe(container);
    });

    it('attaches shadow DOM with open mode', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const { container, shadowRoot } = createShadowContainer(config);

      // In jsdom, shadowRoot is properly attached
      expect(container.shadowRoot).not.toBeNull();
      expect(shadowRoot).not.toBeNull();
    });

    it('reuses existing container if already present', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const { container: first } = createShadowContainer(config);
      const { container: second } = createShadowContainer(config);

      expect(first).toBe(second);
    });

    it('returns existing shadow root if already attached', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const { shadowRoot: first } = createShadowContainer(config);
      const { shadowRoot: second } = createShadowContainer(config);

      expect(first).toBe(second);
    });
  });

  describe('generateCSSVariables', () => {
    it('generates CSS variables with default tokens', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-color-primary');
      expect(cssVars).toContain('--widget-color-secondary');
      expect(cssVars).toContain('--widget-color-accent');
      expect(cssVars).toContain('--widget-font-family');
      expect(cssVars).toContain('--widget-radius-default');
    });

    it('uses theme primary color from config', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
        themePrimary: '#FF0000',
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-color-primary: #FF0000');
    });

    it('uses theme radius from config', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
        themeRadius: '8px',
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-radius-default: 8px');
    });

    it('uses default values when config does not override', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain(`--widget-color-primary: ${DEFAULT_DESIGN_TOKENS.colors.primary}`);
      expect(cssVars).toContain(`--widget-radius-default: ${DEFAULT_DESIGN_TOKENS.borderRadius.default}`);
    });

    it('includes all design token colors', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-color-text-primary');
      expect(cssVars).toContain('--widget-color-text-secondary');
      expect(cssVars).toContain('--widget-color-text-tertiary');
      expect(cssVars).toContain('--widget-color-border');
      expect(cssVars).toContain('--widget-color-disabled');
      expect(cssVars).toContain('--widget-color-surface');
      expect(cssVars).toContain('--widget-color-background');
    });

    it('includes typography tokens', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-font-family');
      expect(cssVars).toContain('--widget-font-size-base');
      expect(cssVars).toContain('--widget-font-weight-regular');
      expect(cssVars).toContain('--widget-font-weight-medium');
      expect(cssVars).toContain('--widget-font-weight-semibold');
      expect(cssVars).toContain('--widget-font-weight-bold');
    });

    it('includes spacing tokens', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-spacing-unit');
    });

    it('includes component-specific tokens', () => {
      const config: WidgetConfig = {
        widgetId: 'wgt_123',
        productId: 1,
      };

      const cssVars = generateCSSVariables(config);

      expect(cssVars).toContain('--widget-chip-diameter');
      expect(cssVars).toContain('--widget-chip-ring');
    });
  });

  describe('injectBaseStyles', () => {
    it('injects style element into shadow root', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });
      const cssVars = generateCSSVariables({
        widgetId: 'wgt_123',
        productId: 1,
      });

      injectBaseStyles(shadowRoot, cssVars);

      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).not.toBeNull();
    });

    it('includes :host styles', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });
      const cssVars = '--widget-color-primary: #5538B6;';

      injectBaseStyles(shadowRoot, cssVars);

      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent).toBeDefined();
      expect(styleElement?.textContent ?? '').toContain(':host');
    });

    it('includes CSS variables in :host', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });
      const cssVars = '--widget-color-primary: #FF0000;';

      injectBaseStyles(shadowRoot, cssVars);

      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent ?? '').toContain('--widget-color-primary: #FF0000');
    });

    it('includes box-sizing reset', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });
      const cssVars = '';

      injectBaseStyles(shadowRoot, cssVars);

      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent ?? '').toContain('box-sizing');
    });
  });

  describe('createMountPoint', () => {
    it('creates mount point with correct ID', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });

      const mountPoint = createMountPoint(shadowRoot);

      expect(mountPoint.id).toBe('widget-mount');
    });

    it('appends mount point to shadow root', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });

      createMountPoint(shadowRoot);

      const mountPoint = shadowRoot.querySelector('#widget-mount');
      expect(mountPoint).not.toBeNull();
    });

    it('sets width and min-height styles', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });

      const mountPoint = createMountPoint(shadowRoot);

      expect(mountPoint.style.width).toBe('100%');
      expect(mountPoint.style.minHeight).toBe('200px');
    });

    it('returns the created mount point element', () => {
      const container = document.createElement('div');
      const shadowRoot = container.attachShadow({ mode: 'open' });

      const mountPoint = createMountPoint(shadowRoot);

      expect(mountPoint).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('cleanupShadowDOM', () => {
    it('removes container from document', () => {
      const container = document.createElement('div');
      container.id = WIDGET_CONTAINER_ID;
      document.body.appendChild(container);

      expect(document.getElementById(WIDGET_CONTAINER_ID)).not.toBeNull();

      cleanupShadowDOM();

      expect(document.getElementById(WIDGET_CONTAINER_ID)).toBeNull();
    });

    it('does not throw when container does not exist', () => {
      expect(() => cleanupShadowDOM()).not.toThrow();
    });
  });
});
