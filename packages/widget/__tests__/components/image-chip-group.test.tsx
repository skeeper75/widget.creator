/**
 * ImageChipGroup Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import {
  ImageChipGroup,
  type ImageChipGroupProps,
  type ImageChipChoice,
} from '@/components/ImageChipGroup';

describe('ImageChipGroup', () => {
  const defaultChoices: ImageChipChoice[] = [
    { id: 1, code: 'ring_black', name: '블랙 링', imageUrl: '/images/ring-black.png' },
    { id: 2, code: 'ring_silver', name: '실버 링', imageUrl: '/images/ring-silver.png' },
    { id: 3, code: 'ring_gold', name: '골드 링', imageUrl: '/images/ring-gold.png' },
  ];

  const defaultProps: ImageChipGroupProps = {
    optionKey: 'ring_type',
    label: '링 선택',
    choices: defaultChoices,
    selectedCode: null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<ImageChipGroup {...defaultProps} />);
      expect(screen.getByText('링 선택')).toBeInTheDocument();
    });

    it('renders as radio group with image-chip variant', () => {
      const { container } = render(<ImageChipGroup {...defaultProps} />);
      expect(container.querySelector('.radio-group--image-chip')).toBeInTheDocument();
    });

    it('renders all choices', () => {
      render(<ImageChipGroup {...defaultProps} />);
      expect(screen.getByText('블랙 링')).toBeInTheDocument();
      expect(screen.getByText('실버 링')).toBeInTheDocument();
      expect(screen.getByText('골드 링')).toBeInTheDocument();
    });

    it('renders images with correct src', () => {
      render(<ImageChipGroup {...defaultProps} />);
      const images = screen.getAllByRole('img');

      expect(images[0]).toHaveAttribute('src', '/images/ring-black.png');
      expect(images[1]).toHaveAttribute('src', '/images/ring-silver.png');
      expect(images[2]).toHaveAttribute('src', '/images/ring-gold.png');
    });

    it('renders images with alt text', () => {
      render(<ImageChipGroup {...defaultProps} />);
      const images = screen.getAllByRole('img');

      expect(images[0]).toHaveAttribute('alt', '블랙 링');
      expect(images[1]).toHaveAttribute('alt', '실버 링');
      expect(images[2]).toHaveAttribute('alt', '골드 링');
    });

    it('sets correct option key', () => {
      const { container } = render(<ImageChipGroup {...defaultProps} />);
      expect(
        container.querySelector('[data-option-key="ring_type"]')
      ).toBeInTheDocument();
    });

    it('marks field as required', () => {
      const { container } = render(<ImageChipGroup {...defaultProps} />);
      expect(container.querySelector('.radio-group__required')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows no selection when selectedCode is null', () => {
      render(<ImageChipGroup {...defaultProps} selectedCode={null} />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });

    it('shows correct item as selected', () => {
      render(<ImageChipGroup {...defaultProps} selectedCode="ring_silver" />);
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
      expect(radios[2]).not.toBeChecked();
    });

    it('updates selection when selectedCode changes', () => {
      const { rerender } = render(
        <ImageChipGroup {...defaultProps} selectedCode="ring_black" />
      );
      expect(screen.getAllByRole('radio')[0]).toBeChecked();

      rerender(<ImageChipGroup {...defaultProps} selectedCode="ring_gold" />);
      expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
      expect(screen.getAllByRole('radio')[2]).toBeChecked();
    });
  });

  describe('interaction', () => {
    it('calls onSelect when item is selected', () => {
      const onSelect = vi.fn();
      render(<ImageChipGroup {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText('실버 링'));
      expect(onSelect).toHaveBeenCalledWith('ring_silver');
    });

    it('calls onSelect with correct code', () => {
      const onSelect = vi.fn();
      render(<ImageChipGroup {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText('골드 링'));
      expect(onSelect).toHaveBeenCalledWith('ring_gold');
    });
  });

  describe('data transformation', () => {
    it('passes choice imageUrl to radio item', () => {
      render(<ImageChipGroup {...defaultProps} />);
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('handles empty choices array', () => {
      const { container } = render(<ImageChipGroup {...defaultProps} choices={[]} />);
      expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
    });

    it('handles single choice', () => {
      render(<ImageChipGroup {...defaultProps} choices={[defaultChoices[0]]} />);
      expect(screen.getAllByRole('radio').length).toBe(1);
    });

    it('handles many choices', () => {
      const manyChoices = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        code: `ring_${i}`,
        name: `링 ${i + 1}`,
        imageUrl: `/images/ring-${i}.png`,
      }));
      render(<ImageChipGroup {...defaultProps} choices={manyChoices} />);
      expect(screen.getAllByRole('radio').length).toBe(10);
    });

    it('handles selectedCode not in choices', () => {
      render(<ImageChipGroup {...defaultProps} selectedCode="nonexistent" />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });
  });
});
