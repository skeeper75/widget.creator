/**
 * SizeSelector Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SizeSelector, type SizeSelectorProps } from '@/components/SizeSelector';
import { createMockProductSizes } from '../utils/mock-factories';

describe('SizeSelector', () => {
  const mockSizes = createMockProductSizes();

  const defaultProps: SizeSelectorProps = {
    sizes: mockSizes,
    selectedSizeId: null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<SizeSelector {...defaultProps} />);
      expect(screen.getByText('사이즈')).toBeInTheDocument();
    });

    it('renders all sizes as options', () => {
      render(<SizeSelector {...defaultProps} />);
      expect(screen.getByText('A4')).toBeInTheDocument();
      expect(screen.getByText('A3')).toBeInTheDocument();
      expect(screen.getByText('B5')).toBeInTheDocument();
      expect(screen.getByText('직접입력')).toBeInTheDocument();
    });

    it('renders as toggle group', () => {
      const { container } = render(<SizeSelector {...defaultProps} />);
      expect(container.querySelector('.toggle-group')).toBeInTheDocument();
    });

    it('sets correct option key', () => {
      const { container } = render(<SizeSelector {...defaultProps} />);
      expect(container.querySelector('[data-option-key="size"]')).toBeInTheDocument();
    });

    it('marks field as required', () => {
      const { container } = render(<SizeSelector {...defaultProps} />);
      expect(container.querySelector('.toggle-group__required')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows no selection when selectedSizeId is null', () => {
      render(<SizeSelector {...defaultProps} selectedSizeId={null} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('shows correct size as selected', () => {
      render(<SizeSelector {...defaultProps} selectedSizeId={2} />);
      const a3Button = screen.getByText('A3').closest('button');
      expect(a3Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('updates selection when selectedSizeId changes', () => {
      const { rerender } = render(<SizeSelector {...defaultProps} selectedSizeId={1} />);
      expect(screen.getByText('A4').closest('button')).toHaveAttribute('aria-pressed', 'true');

      rerender(<SizeSelector {...defaultProps} selectedSizeId={3} />);
      expect(screen.getByText('B5').closest('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('interaction', () => {
    it('calls onSelect with correct size ID when clicked', () => {
      const onSelect = vi.fn();
      render(<SizeSelector {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('A4'));
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('calls onSelect with different size IDs', () => {
      const onSelect = vi.fn();
      render(<SizeSelector {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('A3'));
      expect(onSelect).toHaveBeenCalledWith(2);

      fireEvent.click(screen.getByText('B5'));
      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('handles custom size selection', () => {
      const onSelect = vi.fn();
      render(<SizeSelector {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('직접입력'));
      expect(onSelect).toHaveBeenCalledWith(99);
    });
  });

  describe('data transformation', () => {
    it('converts size ID to string for toggle group value', () => {
      render(<SizeSelector {...defaultProps} selectedSizeId={1} />);
      const a4Button = screen.getByText('A4').closest('button');
      expect(a4Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('converts code back to number for onSelect', () => {
      const onSelect = vi.fn();
      render(<SizeSelector {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('A4'));
      expect(typeof onSelect.mock.calls[0][0]).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('handles empty sizes array', () => {
      const { container } = render(<SizeSelector {...defaultProps} sizes={[]} />);
      expect(container.querySelectorAll('button').length).toBe(0);
    });

    it('handles single size', () => {
      render(<SizeSelector {...defaultProps} sizes={[mockSizes[0]]} />);
      expect(screen.getByText('A4')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('handles selectedSizeId that does not match any size', () => {
      render(<SizeSelector {...defaultProps} selectedSizeId={999} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('handles many sizes', () => {
      const manySizes = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `사이즈 ${i + 1}`,
        width: 100 + i,
        height: 100 + i,
        isCustom: false,
      }));
      render(<SizeSelector {...defaultProps} sizes={manySizes} />);
      expect(screen.getAllByRole('button').length).toBe(20);
    });
  });
});
