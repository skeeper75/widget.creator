/**
 * UploadActions Domain Component
 * Action buttons for file upload, editor, cart, and order
 * @see SPEC-WIDGET-SDK-001 Section 4.4.10
 */

import { h, FunctionalComponent } from 'preact';
import { Button } from '../primitives';
import type { UploadVariant } from '../types';

export interface UploadActionsProps {
  /** Button combination variant */
  variant: UploadVariant;
  /** File upload handler */
  onUpload: () => void;
  /** Editor open handler */
  onEditor: () => void;
  /** Add to cart handler */
  onAddToCart: () => void;
  /** Order submit handler */
  onOrder: () => void;
  /** Whether buttons are disabled */
  disabled: boolean;
}

/**
 * UploadActions - Action button combinations
 * Renders: Button combinations based on variant
 *
 * Variants:
 * - full: Upload + Editor + Cart + Order
 * - editor-only: Editor + Cart
 * - upload-only: Upload + Cart
 * - cart-only: Cart only
 */
export const UploadActions: FunctionalComponent<UploadActionsProps> = ({
  variant,
  onUpload,
  onEditor,
  onAddToCart,
  onOrder,
  disabled,
}) => {
  return (
    <div class="upload-actions">
      <div class="upload-actions__row">
        {(variant === 'full' || variant === 'upload-only') && (
          <Button
            label="파일 업로드"
            variant="upload"
            onClick={onUpload}
            disabled={disabled}
            fullWidth
          />
        )}
        {(variant === 'full' || variant === 'editor-only') && (
          <Button
            label="에디터에서 편집"
            variant="editor"
            onClick={onEditor}
            disabled={disabled}
            fullWidth
          />
        )}
      </div>

      <div class="upload-actions__row">
        {(variant === 'full' || variant === 'upload-only' || variant === 'editor-only') && (
          <Button
            label="장바구니 담기"
            variant="secondary"
            onClick={onAddToCart}
            disabled={disabled}
            fullWidth
          />
        )}
        {variant === 'cart-only' && (
          <Button
            label="장바구니 담기"
            variant="primary"
            onClick={onAddToCart}
            disabled={disabled}
            fullWidth
          />
        )}
        {variant === 'full' && (
          <Button
            label="바로 주문하기"
            variant="primary"
            onClick={onOrder}
            disabled={disabled}
            fullWidth
          />
        )}
      </div>
    </div>
  );
};

export default UploadActions;
