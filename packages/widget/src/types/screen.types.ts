/**
 * Screen Types - Screen configuration and component mapping types
 * @see SPEC-WIDGET-SDK-001 Section 4.5
 */

/**
 * All supported screen types (11 configurations)
 * Each corresponds to a product category's Figma section
 */
export type ScreenType =
  | 'PRINT_OPTION'
  | 'STICKER_OPTION'
  | 'BOOK_OPTION'
  | 'PHOTOBOOK_OPTION'
  | 'CALENDAR_OPTION'
  | 'DESIGN_CALENDAR_OPTION'
  | 'SIGN_OPTION'
  | 'ACRYLIC_OPTION'
  | 'GOODS_OPTION'
  | 'STATIONERY_OPTION'
  | 'ACCESSORY_OPTION';

/**
 * Upload actions variant
 */
export type UploadVariant = 'full' | 'editor-only' | 'upload-only' | 'cart-only';

/**
 * Component configuration for screen composition
 */
export interface ComponentConfig {
  /** Component type to render */
  type: ComponentType;
  /** Optional props overrides */
  props?: Record<string, unknown>;
}

/**
 * All domain component types that can appear in screens
 */
export type ComponentType =
  | 'SizeSelector'
  | 'PaperSelect'
  | 'ToggleGroup'
  | 'NumberInput'
  | 'FinishSection'
  | 'ColorChipGroup'
  | 'ImageChipGroup'
  | 'DualInput'
  | 'QuantitySlider'
  | 'Select'
  | 'PriceSummary'
  | 'UploadActions';

/**
 * Screen configuration
 */
export interface ScreenConfig {
  /** Screen type identifier */
  type: ScreenType;
  /** Ordered list of domain components to render */
  components: ComponentConfig[];
  /** UploadActions variant for this screen */
  uploadVariant: UploadVariant;
}

/**
 * Product size data
 */
export interface ProductSize {
  /** Size ID */
  id: number;
  /** Size name (e.g., "A4", "B5") */
  name: string;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Whether this is a custom size option */
  isCustom: boolean;
  /** Minimum custom width (if isCustom) */
  customMinW?: number;
  /** Maximum custom width (if isCustom) */
  customMaxW?: number;
  /** Minimum custom height (if isCustom) */
  customMinH?: number;
  /** Maximum custom height (if isCustom) */
  customMaxH?: number;
}

/**
 * Paper option data
 */
export interface PaperOption {
  /** Paper ID */
  id: number;
  /** Paper name */
  name: string;
  /** Paper description */
  description?: string;
  /** Color for chip display */
  color?: string;
  /** Cover type: inner, cover, or null for single */
  coverType?: 'inner' | 'cover' | null;
  /** Base weight (gsm) */
  weight?: number;
}

/**
 * Option tree structure for product
 */
export interface OptionTree {
  /** All option definitions indexed by key */
  definitions: Map<string, OptionDefinition>;
  /** Ordered list of option keys for rendering */
  order: string[];
}

// Import OptionDefinition from option.types
import type { OptionDefinition } from './option.types';
