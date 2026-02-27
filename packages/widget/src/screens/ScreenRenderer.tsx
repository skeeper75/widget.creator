/**
 * ScreenRenderer - Screen router based on product.figma_section
 * @see SPEC-WIDGET-SDK-001 Section 4.5
 */

import { FunctionalComponent } from 'preact';
import { PrintOption, type PrintOptionProps } from './PrintOption';
import { StickerOption, type StickerOptionProps } from './StickerOption';
import { AccessoryOption, type AccessoryOptionProps } from './AccessoryOption';
import type { ScreenType } from '../types';

/**
 * Screen Renderer Props
 */
export interface ScreenRendererProps {
  screenType: ScreenType;
  // Common props passed to all screens
  [key: string]: unknown;
}

/**
 * ScreenRenderer - Routes to the appropriate screen configuration
 */
export const ScreenRenderer: FunctionalComponent<ScreenRendererProps> = ({
  screenType,
  ...props
}) => {
  switch (screenType) {
    case 'PRINT_OPTION':
      return <PrintOption {...(props as unknown as PrintOptionProps)} />;

    case 'STICKER_OPTION':
      return <StickerOption {...(props as unknown as StickerOptionProps)} />;

    case 'ACCESSORY_OPTION':
      return <AccessoryOption {...(props as unknown as AccessoryOptionProps)} />;

    // TODO: Implement remaining screens
    case 'BOOK_OPTION':
    case 'PHOTOBOOK_OPTION':
    case 'CALENDAR_OPTION':
    case 'DESIGN_CALENDAR_OPTION':
    case 'SIGN_OPTION':
    case 'ACRYLIC_OPTION':
    case 'GOODS_OPTION':
    case 'STATIONERY_OPTION':
      return (
        <div class="screen screen--placeholder">
          <p>{screenType} 화면은 준비 중입니다.</p>
        </div>
      );

    default:
      return (
        <div class="screen screen--unknown">
          <p>알 수 없는 화면 유형: {screenType}</p>
        </div>
      );
  }
};

/**
 * Get upload variant for a screen type
 */
export function getUploadVariant(screenType: ScreenType): 'full' | 'editor-only' | 'upload-only' | 'cart-only' {
  const variants: Record<ScreenType, 'full' | 'editor-only' | 'upload-only' | 'cart-only'> = {
    PRINT_OPTION: 'full',
    STICKER_OPTION: 'full',
    BOOK_OPTION: 'full',
    PHOTOBOOK_OPTION: 'editor-only',
    CALENDAR_OPTION: 'upload-only',
    DESIGN_CALENDAR_OPTION: 'editor-only',
    SIGN_OPTION: 'upload-only',
    ACRYLIC_OPTION: 'editor-only',
    GOODS_OPTION: 'full',
    STATIONERY_OPTION: 'full',
    ACCESSORY_OPTION: 'cart-only',
  };
  return variants[screenType];
}

export default ScreenRenderer;
