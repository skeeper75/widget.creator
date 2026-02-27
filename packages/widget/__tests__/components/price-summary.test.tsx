/**
 * PriceSummary Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { PriceSummary, type PriceSummaryProps } from '@/components/PriceSummary';
import type { PriceBreakdownItem } from '@/types';

describe('PriceSummary', () => {
  const defaultBreakdown: PriceBreakdownItem[] = [
    { label: '기본 요금', amount: 50000 },
    { label: '용지 추가', amount: 10000 },
    { label: '후가공', amount: 5000 },
  ];

  const defaultProps: PriceSummaryProps = {
    breakdown: defaultBreakdown,
    total: 65000,
    vatAmount: 6500,
    isCalculating: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('견적 요약')).toBeInTheDocument();
    });

    it('renders all breakdown items', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('기본 요금')).toBeInTheDocument();
      expect(screen.getByText('용지 추가')).toBeInTheDocument();
      expect(screen.getByText('후가공')).toBeInTheDocument();
    });

    it('renders breakdown amounts', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('50,000원')).toBeInTheDocument();
      expect(screen.getByText('10,000원')).toBeInTheDocument();
      expect(screen.getByText('5,000원')).toBeInTheDocument();
    });

    it('renders subtotal', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('소계')).toBeInTheDocument();
      expect(screen.getByText('65,000원')).toBeInTheDocument();
    });

    it('renders VAT', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('VAT (10%)')).toBeInTheDocument();
      expect(screen.getByText('6,500원')).toBeInTheDocument();
    });

    it('renders grand total', () => {
      render(<PriceSummary {...defaultProps} />);
      expect(screen.getByText('총 금액')).toBeInTheDocument();
      // Total = 65000 + 6500 = 71500
      expect(screen.getByText('71,500원')).toBeInTheDocument();
    });

    it('renders detail text when provided', () => {
      const breakdownWithDetail: PriceBreakdownItem[] = [
        { label: '인쇄', amount: 50000, detail: '양면 컬러' },
      ];
      render(<PriceSummary {...defaultProps} breakdown={breakdownWithDetail} />);
      expect(screen.getByText('양면 컬러')).toBeInTheDocument();
    });
  });

  describe('calculating state', () => {
    it('shows loading state when calculating', () => {
      render(<PriceSummary {...defaultProps} isCalculating={true} />);
      expect(screen.getByText('가격 계산 중...')).toBeInTheDocument();
    });

    it('hides breakdown when calculating', () => {
      render(<PriceSummary {...defaultProps} isCalculating={true} />);
      expect(screen.queryByText('기본 요금')).not.toBeInTheDocument();
    });

    it('shows spinner when calculating', () => {
      const { container } = render(
        <PriceSummary {...defaultProps} isCalculating={true} />
      );
      expect(container.querySelector('.price-summary__spinner')).toBeInTheDocument();
    });
  });

  describe('price calculation', () => {
    it('calculates grand total correctly', () => {
      render(
        <PriceSummary
          {...defaultProps}
          total={100000}
          vatAmount={10000}
        />
      );
      // Grand total = 100000 + 10000 = 110000
      expect(screen.getByText('110,000원')).toBeInTheDocument();
    });

    it('handles zero values', () => {
      render(
        <PriceSummary
          {...defaultProps}
          breakdown={[]}
          total={0}
          vatAmount={0}
        />
      );
      // Multiple elements may contain "0원" - check total row
      const totalAmount = screen.getByText('총 금액').nextElementSibling;
      expect(totalAmount).toHaveTextContent('0원');
    });

    it('handles large values', () => {
      render(
        <PriceSummary
          {...defaultProps}
          total={10000000}
          vatAmount={1000000}
        />
      );
      expect(screen.getByText('10,000,000원')).toBeInTheDocument();
      expect(screen.getByText('11,000,000원')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty breakdown', () => {
      const { container } = render(
        <PriceSummary
          {...defaultProps}
          breakdown={[]}
        />
      );
      expect(container.querySelector('.price-summary__breakdown')).toBeInTheDocument();
    });

    it('handles single breakdown item', () => {
      render(
        <PriceSummary
          {...defaultProps}
          breakdown={[{ label: '총액', amount: 100000 }]}
        />
      );
      expect(screen.getByText('총액')).toBeInTheDocument();
      expect(screen.getByText('100,000원')).toBeInTheDocument();
    });

    it('handles many breakdown items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        label: `항목 ${i + 1}`,
        amount: (i + 1) * 1000,
      }));
      render(<PriceSummary {...defaultProps} breakdown={manyItems} />);

      expect(screen.getByText('항목 1')).toBeInTheDocument();
      expect(screen.getByText('항목 20')).toBeInTheDocument();
    });

    it('handles items without detail', () => {
      const breakdownNoDetail: PriceBreakdownItem[] = [
        { label: '기본', amount: 10000 },
      ];
      const { container } = render(
        <PriceSummary {...defaultProps} breakdown={breakdownNoDetail} />
      );
      expect(container.querySelector('.price-summary__item-detail')).not.toBeInTheDocument();
    });
  });
});
