/**
 * PaperSelect Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { PaperSelect, type PaperSelectProps } from '@/components/PaperSelect';
import { createMockPaperOptions } from '../utils/mock-factories';

describe('PaperSelect', () => {
  const mockPapers = createMockPaperOptions();

  const defaultProps: PaperSelectProps = {
    papers: mockPapers,
    selectedPaperId: null,
    onSelect: vi.fn(),
    coverType: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default label when no coverType', () => {
      render(<PaperSelect {...defaultProps} coverType={null} />);
      expect(screen.getByText('용지')).toBeInTheDocument();
    });

    it('renders with inner label when coverType is inner', () => {
      render(<PaperSelect {...defaultProps} coverType="inner" />);
      expect(screen.getByText('내지 용지')).toBeInTheDocument();
    });

    it('renders with cover label when coverType is cover', () => {
      render(<PaperSelect {...defaultProps} coverType="cover" />);
      expect(screen.getByText('표지 용지')).toBeInTheDocument();
    });

    it('renders as select with chip variant', () => {
      const { container } = render(<PaperSelect {...defaultProps} />);
      expect(container.querySelector('.select--with-chip')).toBeInTheDocument();
    });

    it('sets correct option key for default', () => {
      const { container } = render(<PaperSelect {...defaultProps} coverType={null} />);
      expect(container.querySelector('[data-option-key="paper"]')).toBeInTheDocument();
    });

    it('sets correct option key for inner', () => {
      const { container } = render(<PaperSelect {...defaultProps} coverType="inner" />);
      expect(container.querySelector('[data-option-key="paper-inner"]')).toBeInTheDocument();
    });

    it('sets correct option key for cover', () => {
      const { container } = render(<PaperSelect {...defaultProps} coverType="cover" />);
      expect(container.querySelector('[data-option-key="paper-cover"]')).toBeInTheDocument();
    });

    it('renders placeholder', () => {
      render(<PaperSelect {...defaultProps} />);
      expect(screen.getByText('용지를 선택해주세요')).toBeInTheDocument();
    });

    it('marks field as required', () => {
      const { container } = render(<PaperSelect {...defaultProps} />);
      expect(container.querySelector('.select__required')).toBeInTheDocument();
    });
  });

  describe('paper filtering by coverType', () => {
    it('shows all papers when coverType is null', () => {
      const papers = [
        { id: 1, name: '모조지 80g', color: '#FFF', coverType: null },
        { id: 2, name: '내지용', color: '#FFF', coverType: 'inner' },
        { id: 3, name: '표지용', color: '#FFF', coverType: 'cover' },
      ];
      render(<PaperSelect {...defaultProps} papers={papers} coverType={null} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('모조지 80g')).toBeInTheDocument();
      expect(screen.getByText('내지용')).toBeInTheDocument();
      expect(screen.getByText('표지용')).toBeInTheDocument();
    });

    it('filters papers by inner coverType', () => {
      const papers = [
        { id: 1, name: '모조지 80g', color: '#FFF', coverType: null },
        { id: 2, name: '내지용', color: '#FFF', coverType: 'inner' },
        { id: 3, name: '표지용', color: '#FFF', coverType: 'cover' },
      ];
      render(<PaperSelect {...defaultProps} papers={papers} coverType="inner" />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByText('모조지 80g')).not.toBeInTheDocument();
      expect(screen.getByText('내지용')).toBeInTheDocument();
      expect(screen.queryByText('표지용')).not.toBeInTheDocument();
    });

    it('filters papers by cover coverType', () => {
      const papers = [
        { id: 1, name: '모조지 80g', color: '#FFF', coverType: null },
        { id: 2, name: '내지용', color: '#FFF', coverType: 'inner' },
        { id: 3, name: '표지용', color: '#FFF', coverType: 'cover' },
      ];
      render(<PaperSelect {...defaultProps} papers={papers} coverType="cover" />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByText('모조지 80g')).not.toBeInTheDocument();
      expect(screen.queryByText('내지용')).not.toBeInTheDocument();
      expect(screen.getByText('표지용')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows placeholder when no paper is selected', () => {
      render(<PaperSelect {...defaultProps} selectedPaperId={null} />);
      expect(screen.getByText('용지를 선택해주세요')).toBeInTheDocument();
    });

    it('shows selected paper name', () => {
      render(<PaperSelect {...defaultProps} selectedPaperId={1} />);
      expect(screen.getByText('모조지 80g')).toBeInTheDocument();
    });

    it('updates displayed paper when selection changes', () => {
      const { rerender } = render(<PaperSelect {...defaultProps} selectedPaperId={1} />);
      expect(screen.getByText('모조지 80g')).toBeInTheDocument();

      rerender(<PaperSelect {...defaultProps} selectedPaperId={2} />);
      expect(screen.getByText('모조지 100g')).toBeInTheDocument();
    });
  });

  describe('color chip', () => {
    it('displays color chip for selected paper', () => {
      const papers = [
        { id: 1, name: '흰색 용지', color: '#FFFFFF' },
        { id: 2, name: '아이보리', color: '#FFFFF0' },
      ];
      render(<PaperSelect {...defaultProps} papers={papers} selectedPaperId={1} />);

      const trigger = screen.getByRole('button');
      const chip = trigger.querySelector('.select__chip');
      expect(chip).toHaveStyle({ backgroundColor: '#FFFFFF' });
    });

    it('displays color chips in dropdown options', () => {
      const papers = [
        { id: 1, name: '흰색 용지', color: '#FFFFFF' },
        { id: 2, name: '아이보리', color: '#FFFFF0' },
      ];
      render(<PaperSelect {...defaultProps} papers={papers} />);

      fireEvent.click(screen.getByRole('button'));
      const options = screen.getAllByRole('option');
      expect(options[0].querySelector('.select__option-chip')).toBeInTheDocument();
      expect(options[1].querySelector('.select__option-chip')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onSelect with paper ID when selected', () => {
      const onSelect = vi.fn();
      render(<PaperSelect {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('모조지 100g'));

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('calls onSelect with number type', () => {
      const onSelect = vi.fn();
      render(<PaperSelect {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('모조지 80g'));

      expect(typeof onSelect.mock.calls[0][0]).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('handles empty papers array', () => {
      render(<PaperSelect {...defaultProps} papers={[]} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('handles paper without color', () => {
      const papers = [{ id: 1, name: '색상 없음' }];
      render(<PaperSelect {...defaultProps} papers={papers} selectedPaperId={1} />);

      const trigger = screen.getByRole('button');
      expect(trigger.querySelector('.select__chip')).not.toBeInTheDocument();
    });

    it('handles selectedPaperId not in filtered list', () => {
      const papers = [
        { id: 1, name: '내지용', color: '#FFF', coverType: 'inner' },
      ];
      render(
        <PaperSelect
          {...defaultProps}
          papers={papers}
          coverType="cover"
          selectedPaperId={1}
        />
      );

      // Should show placeholder since paper 1 is not in cover type
      expect(screen.getByText('용지를 선택해주세요')).toBeInTheDocument();
    });
  });
});
