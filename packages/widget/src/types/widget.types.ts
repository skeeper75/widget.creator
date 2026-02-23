/**
 * Widget Types - Core widget state and configuration types
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

import type { ScreenType } from './screen.types';

/**
 * Widget loading/interaction status
 */
export type WidgetStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'selecting'
  | 'validating'
  | 'constrained'
  | 'error'
  | 'complete';

/**
 * Core widget state
 */
export interface WidgetState {
  /** Current product ID */
  productId: number;
  /** Screen configuration type derived from product.figma_section */
  screenType: ScreenType;
  /** Current widget status */
  status: WidgetStatus;
}

/**
 * Widget configuration from embed script attributes
 */
export interface WidgetConfig {
  /** Widget instance identifier */
  widgetId: string;
  /** Product ID to render */
  productId: number;
  /** Primary color override (hex) */
  themePrimary?: string;
  /** Border radius override */
  themeRadius?: string;
  /** UI locale (default: ko) */
  locale?: string;
}

/**
 * Design tokens for theming
 */
export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    disabled: string;
    surface: string;
    background: string;
  };
  typography: {
    fontFamily: string;
    weights: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    baseSize: string;
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    default: string;
    chip: string;
    small: string;
  };
  components: {
    colorChip: {
      diameter: string;
      selectedRing: string;
    };
  };
}

/**
 * Default design tokens
 */
export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: '#5538B6',
    secondary: '#4B3F96',
    accent: '#F0831E',
    textPrimary: '#424242',
    textSecondary: '#979797',
    textTertiary: '#A5A5A5',
    border: '#CACACA',
    disabled: '#D9D9D9',
    surface: '#F6F6F6',
    background: '#F5F6F8',
  },
  typography: {
    fontFamily: "'Noto Sans KR', 'Noto Sans', sans-serif",
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    baseSize: '14px',
  },
  spacing: {
    unit: 4,
  },
  borderRadius: {
    default: '4px',
    chip: '20px',
    small: '3px',
  },
  components: {
    colorChip: {
      diameter: '50px',
      selectedRing: '52px',
    },
  },
};
