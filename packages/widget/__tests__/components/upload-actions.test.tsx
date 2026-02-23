/**
 * UploadActions Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { UploadActions, type UploadActionsProps } from '@/components/UploadActions';

describe('UploadActions', () => {
  const defaultProps: UploadActionsProps = {
    variant: 'full',
    onUpload: vi.fn(),
    onEditor: vi.fn(),
    onAddToCart: vi.fn(),
    onOrder: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('full variant', () => {
    it('renders all buttons', () => {
      render(<UploadActions {...defaultProps} variant="full" />);
      expect(screen.getByText('파일 업로드')).toBeInTheDocument();
      expect(screen.getByText('에디터에서 편집')).toBeInTheDocument();
      expect(screen.getByText('장바구니 담기')).toBeInTheDocument();
      expect(screen.getByText('바로 주문하기')).toBeInTheDocument();
    });

    it('has 4 buttons', () => {
      render(<UploadActions {...defaultProps} variant="full" />);
      expect(screen.getAllByRole('button').length).toBe(4);
    });

    it('calls onUpload when upload button clicked', () => {
      const onUpload = vi.fn();
      render(<UploadActions {...defaultProps} variant="full" onUpload={onUpload} />);
      fireEvent.click(screen.getByText('파일 업로드'));
      expect(onUpload).toHaveBeenCalled();
    });

    it('calls onEditor when editor button clicked', () => {
      const onEditor = vi.fn();
      render(<UploadActions {...defaultProps} variant="full" onEditor={onEditor} />);
      fireEvent.click(screen.getByText('에디터에서 편집'));
      expect(onEditor).toHaveBeenCalled();
    });

    it('calls onAddToCart when cart button clicked', () => {
      const onAddToCart = vi.fn();
      render(
        <UploadActions {...defaultProps} variant="full" onAddToCart={onAddToCart} />
      );
      fireEvent.click(screen.getByText('장바구니 담기'));
      expect(onAddToCart).toHaveBeenCalled();
    });

    it('calls onOrder when order button clicked', () => {
      const onOrder = vi.fn();
      render(<UploadActions {...defaultProps} variant="full" onOrder={onOrder} />);
      fireEvent.click(screen.getByText('바로 주문하기'));
      expect(onOrder).toHaveBeenCalled();
    });
  });

  describe('editor-only variant', () => {
    it('renders editor and cart buttons only', () => {
      render(<UploadActions {...defaultProps} variant="editor-only" />);
      expect(screen.queryByText('파일 업로드')).not.toBeInTheDocument();
      expect(screen.getByText('에디터에서 편집')).toBeInTheDocument();
      expect(screen.getByText('장바구니 담기')).toBeInTheDocument();
      expect(screen.queryByText('바로 주문하기')).not.toBeInTheDocument();
    });

    it('has 2 buttons', () => {
      render(<UploadActions {...defaultProps} variant="editor-only" />);
      expect(screen.getAllByRole('button').length).toBe(2);
    });

    it('calls correct handlers', () => {
      const onEditor = vi.fn();
      const onAddToCart = vi.fn();
      render(
        <UploadActions
          {...defaultProps}
          variant="editor-only"
          onEditor={onEditor}
          onAddToCart={onAddToCart}
        />
      );

      fireEvent.click(screen.getByText('에디터에서 편집'));
      expect(onEditor).toHaveBeenCalled();

      fireEvent.click(screen.getByText('장바구니 담기'));
      expect(onAddToCart).toHaveBeenCalled();
    });
  });

  describe('upload-only variant', () => {
    it('renders upload and cart buttons only', () => {
      render(<UploadActions {...defaultProps} variant="upload-only" />);
      expect(screen.getByText('파일 업로드')).toBeInTheDocument();
      expect(screen.queryByText('에디터에서 편집')).not.toBeInTheDocument();
      expect(screen.getByText('장바구니 담기')).toBeInTheDocument();
      expect(screen.queryByText('바로 주문하기')).not.toBeInTheDocument();
    });

    it('has 2 buttons', () => {
      render(<UploadActions {...defaultProps} variant="upload-only" />);
      expect(screen.getAllByRole('button').length).toBe(2);
    });

    it('calls correct handlers', () => {
      const onUpload = vi.fn();
      const onAddToCart = vi.fn();
      render(
        <UploadActions
          {...defaultProps}
          variant="upload-only"
          onUpload={onUpload}
          onAddToCart={onAddToCart}
        />
      );

      fireEvent.click(screen.getByText('파일 업로드'));
      expect(onUpload).toHaveBeenCalled();

      fireEvent.click(screen.getByText('장바구니 담기'));
      expect(onAddToCart).toHaveBeenCalled();
    });
  });

  describe('cart-only variant', () => {
    it('renders cart button only', () => {
      render(<UploadActions {...defaultProps} variant="cart-only" />);
      expect(screen.queryByText('파일 업로드')).not.toBeInTheDocument();
      expect(screen.queryByText('에디터에서 편집')).not.toBeInTheDocument();
      expect(screen.getByText('장바구니 담기')).toBeInTheDocument();
      expect(screen.queryByText('바로 주문하기')).not.toBeInTheDocument();
    });

    it('has 1 button', () => {
      render(<UploadActions {...defaultProps} variant="cart-only" />);
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('cart button is primary variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="cart-only" />
      );
      const cartButton = screen.getByText('장바구니 담기').closest('button');
      expect(cartButton?.className).toContain('button--primary');
    });

    it('calls onAddToCart when clicked', () => {
      const onAddToCart = vi.fn();
      render(
        <UploadActions
          {...defaultProps}
          variant="cart-only"
          onAddToCart={onAddToCart}
        />
      );
      fireEvent.click(screen.getByText('장바구니 담기'));
      expect(onAddToCart).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('disables all buttons when disabled is true', () => {
      render(<UploadActions {...defaultProps} variant="full" disabled={true} />);
      screen.getAllByRole('button').forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('enables all buttons when disabled is false', () => {
      render(<UploadActions {...defaultProps} variant="full" disabled={false} />);
      screen.getAllByRole('button').forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it('prevents click when disabled', () => {
      const onUpload = vi.fn();
      render(
        <UploadActions {...defaultProps} variant="full" disabled={true} onUpload={onUpload} />
      );

      // The button element is the parent of the text span
      const uploadLabel = screen.getByText('파일 업로드');
      const uploadButton = uploadLabel.closest('button');
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('button variants', () => {
    it('upload button has upload variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="upload-only" />
      );
      expect(container.querySelector('.button--upload')).toBeInTheDocument();
    });

    it('editor button has editor variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="editor-only" />
      );
      expect(container.querySelector('.button--editor')).toBeInTheDocument();
    });

    it('cart button in full variant has secondary variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="full" />
      );
      const buttons = container.querySelectorAll('.button--secondary');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('order button has primary variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="full" />
      );
      const primaryButtons = container.querySelectorAll('.button--primary');
      expect(primaryButtons.length).toBeGreaterThan(0);
    });
  });

  describe('full width', () => {
    it('buttons have full-width class', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="full" />
      );
      const fullWidthButtons = container.querySelectorAll('.button--full-width');
      expect(fullWidthButtons.length).toBe(4);
    });
  });

  describe('layout structure', () => {
    it('has correct structure for full variant', () => {
      const { container } = render(
        <UploadActions {...defaultProps} variant="full" />
      );
      const rows = container.querySelectorAll('.upload-actions__row');
      expect(rows.length).toBe(2);
    });

    it('first row contains upload and editor buttons', () => {
      render(<UploadActions {...defaultProps} variant="full" />);
      const buttons = screen.getAllByRole('button');
      // First two buttons: upload and editor
      expect(buttons[0]).toHaveTextContent('파일 업로드');
      expect(buttons[1]).toHaveTextContent('에디터에서 편집');
    });

    it('second row contains cart and order buttons', () => {
      render(<UploadActions {...defaultProps} variant="full" />);
      const buttons = screen.getAllByRole('button');
      // Last two buttons: cart and order
      expect(buttons[2]).toHaveTextContent('장바구니 담기');
      expect(buttons[3]).toHaveTextContent('바로 주문하기');
    });
  });
});
