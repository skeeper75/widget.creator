/**
 * QuantitySlider Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import {
  QuantitySlider,
  type QuantitySliderProps,
  type QuantityTier,
} from '@/components/QuantitySlider';

describe('QuantitySlider', () => {
  const defaultTiers: QuantityTier[] = [
    { minQty: 100, maxQty: 499, unitPrice: 100 },
    { minQty: 500, maxQty: 999, unitPrice: 80 },
    { minQty: 1000, maxQty: 9999, unitPrice: 60 },
  ];

  const defaultProps: QuantitySliderProps = {
    value: 100,
    onChange: vi.fn(),
    tiers: defaultTiers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<QuantitySlider {...defaultProps} />);
      expect(screen.getByText('수량 구간 선택')).toBeInTheDocument();
    });

    it('renders as slider with tier-display variant', () => {
      const { container } = render(<QuantitySlider {...defaultProps} />);
      expect(container.querySelector('.slider--tier-display')).toBeInTheDocument();
    });

    it('sets correct option key', () => {
      const { container } = render(<QuantitySlider {...defaultProps} />);
      expect(container.querySelector('[data-option-key="quantity"]')).toBeInTheDocument();
    });

    it('renders tier labels', () => {
      render(<QuantitySlider {...defaultProps} />);
      // Component uses "min~max개" format when maxQty is truthy (including 9999)
      expect(screen.getByText('100~499개')).toBeInTheDocument();
      expect(screen.getByText('500~999개')).toBeInTheDocument();
      // Third tier has maxQty: 9999, so it renders as range, not "이상"
      expect(screen.getByText('1000~9999개')).toBeInTheDocument();
    });

    it('renders price overlay', () => {
      render(<QuantitySlider {...defaultProps} />);
      expect(screen.getByText('100원')).toBeInTheDocument();
      expect(screen.getByText('80원')).toBeInTheDocument();
      expect(screen.getByText('60원')).toBeInTheDocument();
    });

    it('renders range input', () => {
      render(<QuantitySlider {...defaultProps} />);
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('tier label generation', () => {
    it('generates correct label for tiers with max', () => {
      const tiers: QuantityTier[] = [
        { minQty: 100, maxQty: 200, unitPrice: 100 },
      ];
      render(<QuantitySlider {...defaultProps} tiers={tiers} />);
      expect(screen.getByText('100~200개')).toBeInTheDocument();
    });

    it('generates correct label for tiers without max (maxQty = 0)', () => {
      // To render "X개 이상", maxQty must be 0 (falsy)
      const tiers: QuantityTier[] = [
        { minQty: 500, maxQty: 0, unitPrice: 80 },
      ];
      render(<QuantitySlider {...defaultProps} tiers={tiers} />);
      expect(screen.getByText('500개 이상')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows current selection', () => {
      render(<QuantitySlider {...defaultProps} value={500} />);
      expect(screen.getByText(/선택: 500~999개/)).toBeInTheDocument();
    });

    it('shows current price per unit', () => {
      render(<QuantitySlider {...defaultProps} value={1000} />);
      expect(screen.getByText(/60원\/개/)).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onChange when slider changes', () => {
      const onChange = vi.fn();
      render(<QuantitySlider {...defaultProps} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1' } }); // Index 1 = 500

      expect(onChange).toHaveBeenCalledWith(500);
    });

    it('calls onChange with correct tier value', () => {
      const onChange = vi.fn();
      render(<QuantitySlider {...defaultProps} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2' } }); // Index 2 = 1000

      expect(onChange).toHaveBeenCalledWith(1000);
    });
  });

  describe('edge cases', () => {
    it('handles single tier', () => {
      const singleTier: QuantityTier[] = [
        { minQty: 100, maxQty: 9999, unitPrice: 100 },
      ];
      render(<QuantitySlider {...defaultProps} tiers={singleTier} value={100} />);

      // Component renders "min~max개" format for range display
      // Use more specific matcher to avoid matching multiple elements
      expect(screen.getByText('100~9999개')).toBeInTheDocument();
    });

    it('handles many tiers', () => {
      const manyTiers = Array.from({ length: 10 }, (_, i) => ({
        minQty: (i + 1) * 100,
        maxQty: (i + 1) * 100 + 99,
        unitPrice: 100 - i * 5,
      }));
      render(<QuantitySlider {...defaultProps} tiers={manyTiers} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.max).toBe('9'); // 0-indexed
    });

    it('handles high unit prices', () => {
      const expensiveTiers: QuantityTier[] = [
        { minQty: 100, maxQty: 9999, unitPrice: 1000000 },
      ];
      render(<QuantitySlider {...defaultProps} tiers={expensiveTiers} />);
      expect(screen.getByText('1,000,000원')).toBeInTheDocument();
    });
  });
});
