/**
 * Slider Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Slider, type SliderProps, type SliderTier } from '@/primitives/Slider';

describe('Slider', () => {
  const defaultTiers: SliderTier[] = [
    { qty: 100, unitPrice: 100, label: '100장' },
    { qty: 500, unitPrice: 80, label: '500장' },
    { qty: 1000, unitPrice: 60, label: '1,000장' },
    { qty: 2000, unitPrice: 50, label: '2,000장' },
  ];

  const defaultProps: SliderProps = {
    optionKey: 'quantity',
    label: '수량 선택',
    value: 100,
    onChange: vi.fn(),
    variant: 'tier-display',
    tiers: defaultTiers,
    showPriceOverlay: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<Slider {...defaultProps} />);
      expect(screen.getByText('수량 선택')).toBeInTheDocument();
    });

    it('renders all tier labels', () => {
      render(<Slider {...defaultProps} />);
      expect(screen.getByText('100장')).toBeInTheDocument();
      expect(screen.getByText('500장')).toBeInTheDocument();
      expect(screen.getByText('1,000장')).toBeInTheDocument();
      expect(screen.getByText('2,000장')).toBeInTheDocument();
    });

    it('renders price overlay when showPriceOverlay is true', () => {
      render(<Slider {...defaultProps} showPriceOverlay={true} />);
      expect(screen.getByText('100원')).toBeInTheDocument();
      expect(screen.getByText('80원')).toBeInTheDocument();
    });

    it('does not render price overlay when showPriceOverlay is false', () => {
      render(<Slider {...defaultProps} showPriceOverlay={false} />);
      expect(screen.queryByText('100원')).not.toBeInTheDocument();
    });

    it('renders current selection display', () => {
      render(<Slider {...defaultProps} value={500} />);
      expect(screen.getByText(/선택: 500장/)).toBeInTheDocument();
    });

    it('applies variant class correctly', () => {
      const { container } = render(<Slider {...defaultProps} variant="tier-display" />);
      expect(container.querySelector('.slider--tier-display')).toBeInTheDocument();
    });

    it('sets data-option-key attribute', () => {
      const { container } = render(<Slider {...defaultProps} />);
      expect(container.querySelector('[data-option-key="quantity"]')).toBeInTheDocument();
    });

    it('uses qty as label when tier label is not provided', () => {
      const tiersWithoutLabels: SliderTier[] = [
        { qty: 100, unitPrice: 100 },
        { qty: 500, unitPrice: 80 },
      ];
      render(<Slider {...defaultProps} tiers={tiersWithoutLabels} />);
      expect(screen.getByText('100개')).toBeInTheDocument();
    });
  });

  describe('slider interaction', () => {
    it('renders range input with correct attributes', () => {
      render(<Slider {...defaultProps} />);
      const slider = screen.getByRole('slider');

      expect(slider).toHaveAttribute('type', 'range');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '3'); // 4 tiers - 1
    });

    it('calls onChange when slider value changes', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2' } }); // Index 2 = 1000

      expect(onChange).toHaveBeenCalledWith(1000);
    });

    it('selects first tier by default when value not in tiers', () => {
      render(<Slider {...defaultProps} value={999} />);
      // Should default to index 0 (first tier)
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });
  });

  describe('active tier highlighting', () => {
    it('highlights first tier when value is first tier qty', () => {
      const { container } = render(<Slider {...defaultProps} value={100} />);
      const tiers = container.querySelectorAll('.slider__tier');
      expect(tiers[0]).toHaveClass('slider__tier--active');
    });

    it('highlights second tier when value is second tier qty', () => {
      const { container } = render(<Slider {...defaultProps} value={500} />);
      const tiers = container.querySelectorAll('.slider__tier');
      expect(tiers[1]).toHaveClass('slider__tier--active');
    });

    it('updates active tier when value changes', () => {
      const { container, rerender } = render(<Slider {...defaultProps} value={100} />);
      expect(container.querySelectorAll('.slider__tier')[0]).toHaveClass('slider__tier--active');

      rerender(<Slider {...defaultProps} value={2000} />);
      expect(container.querySelectorAll('.slider__tier')[3]).toHaveClass('slider__tier--active');
    });
  });

  describe('current selection display', () => {
    it('shows current selection with price per unit when showPriceOverlay is true', () => {
      render(<Slider {...defaultProps} value={500} showPriceOverlay={true} />);
      // Check that the selection text contains the tier label and price
      const selectionText = screen.getByText(/선택: 500장/).textContent;
      expect(selectionText).toContain('500장');
      expect(selectionText).toContain('80원');
    });

    it('shows current selection without price when showPriceOverlay is false', () => {
      render(<Slider {...defaultProps} value={500} showPriceOverlay={false} />);
      const selection = screen.getByText(/선택: 500장/);
      expect(selection).toBeInTheDocument();
      expect(selection.textContent).not.toContain('/개');
    });

    it('uses qty when label is not provided', () => {
      const tiersWithoutLabels: SliderTier[] = [
        { qty: 100, unitPrice: 100 },
      ];
      render(<Slider {...defaultProps} tiers={tiersWithoutLabels} value={100} />);
      expect(screen.getByText(/선택: 100개/)).toBeInTheDocument();
    });
  });

  describe('tier sorting', () => {
    it('sorts tiers by qty ascending', () => {
      const unsortedTiers: SliderTier[] = [
        { qty: 2000, unitPrice: 50 },
        { qty: 100, unitPrice: 100 },
        { qty: 500, unitPrice: 80 },
      ];
      const { container } = render(<Slider {...defaultProps} tiers={unsortedTiers} />);

      const tierElements = container.querySelectorAll('.slider__tier');
      const tierQtys = Array.from(tierElements).map((el) => el.textContent);
      expect(tierQtys[0]).toContain('100');
      expect(tierQtys[1]).toContain('500');
      expect(tierQtys[2]).toContain('2000'); // Without comma since no label
    });
  });

  describe('edge cases', () => {
    it('handles single tier', () => {
      const singleTier: SliderTier[] = [{ qty: 100, unitPrice: 100, label: '100장' }];
      render(<Slider {...defaultProps} tiers={singleTier} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toHaveAttribute('max', '0');
      expect(screen.getByText('100장')).toBeInTheDocument();
    });

    it('handles many tiers', () => {
      const manyTiers = Array.from({ length: 20 }, (_, i) => ({
        qty: (i + 1) * 100,
        unitPrice: 100 - i * 5,
      }));
      render(<Slider {...defaultProps} tiers={manyTiers} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toHaveAttribute('max', '19');
    });

    it('handles zero qty tier', () => {
      const zeroTier: SliderTier[] = [{ qty: 0, unitPrice: 0, label: '무료' }];
      render(<Slider {...defaultProps} tiers={zeroTier} value={0} />);
      expect(screen.getByText('무료')).toBeInTheDocument();
    });

    it('handles high unit prices', () => {
      const expensiveTiers: SliderTier[] = [
        { qty: 100, unitPrice: 1000000, label: '프리미엄' },
      ];
      render(<Slider {...defaultProps} tiers={expensiveTiers} />);
      expect(screen.getByText('1,000,000원')).toBeInTheDocument();
    });
  });
});
