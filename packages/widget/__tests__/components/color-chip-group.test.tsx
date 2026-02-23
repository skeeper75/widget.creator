/**
 * ColorChipGroup Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import {
  ColorChipGroup,
  type ColorChipGroupProps,
  type ColorChipChoice,
} from '@/components/ColorChipGroup';

describe('ColorChipGroup', () => {
  const defaultChoices: ColorChipChoice[] = [
    { id: 1, code: 'white', name: '흰색', color: '#FFFFFF' },
    { id: 2, code: 'ivory', name: '아이보리', color: '#FFFFF0' },
    { id: 3, code: 'cream', name: '크림', color: '#FFFDD0' },
  ];

  const defaultProps: ColorChipGroupProps = {
    optionKey: 'paper_color',
    label: '용지 색상',
    choices: defaultChoices,
    selectedCode: null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<ColorChipGroup {...defaultProps} />);
      expect(screen.getByText('용지 색상')).toBeInTheDocument();
    });

    it('renders as radio group with color-chip variant', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} />);
      expect(container.querySelector('.radio-group--color-chip')).toBeInTheDocument();
    });

    it('renders all choices', () => {
      render(<ColorChipGroup {...defaultProps} />);
      expect(screen.getByText('흰색')).toBeInTheDocument();
      expect(screen.getByText('아이보리')).toBeInTheDocument();
      expect(screen.getByText('크림')).toBeInTheDocument();
    });

    it('renders color chips with correct colors', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} />);
      const chips = container.querySelectorAll('.radio-group__color-chip');

      expect(chips[0]).toHaveStyle({ backgroundColor: '#FFFFFF' });
      expect(chips[1]).toHaveStyle({ backgroundColor: '#FFFFF0' });
      expect(chips[2]).toHaveStyle({ backgroundColor: '#FFFDD0' });
    });

    it('sets correct option key', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} />);
      expect(
        container.querySelector('[data-option-key="paper_color"]')
      ).toBeInTheDocument();
    });

    it('marks field as required', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} />);
      expect(container.querySelector('.radio-group__required')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows no selection when selectedCode is null', () => {
      render(<ColorChipGroup {...defaultProps} selectedCode={null} />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });

    it('shows correct item as selected', () => {
      render(<ColorChipGroup {...defaultProps} selectedCode="ivory" />);
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
      expect(radios[2]).not.toBeChecked();
    });

    it('updates selection when selectedCode changes', () => {
      const { rerender } = render(
        <ColorChipGroup {...defaultProps} selectedCode="white" />
      );
      expect(screen.getAllByRole('radio')[0]).toBeChecked();

      rerender(<ColorChipGroup {...defaultProps} selectedCode="cream" />);
      expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
      expect(screen.getAllByRole('radio')[2]).toBeChecked();
    });
  });

  describe('interaction', () => {
    it('calls onSelect when item is selected', () => {
      const onSelect = vi.fn();
      render(<ColorChipGroup {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText('아이보리'));
      expect(onSelect).toHaveBeenCalledWith('ivory');
    });

    it('calls onSelect with correct code', () => {
      const onSelect = vi.fn();
      render(<ColorChipGroup {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText('크림'));
      expect(onSelect).toHaveBeenCalledWith('cream');
    });
  });

  describe('data transformation', () => {
    it('passes choice color to radio item', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} />);
      const chips = container.querySelectorAll('.radio-group__color-chip');
      expect(chips.length).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('handles empty choices array', () => {
      const { container } = render(<ColorChipGroup {...defaultProps} choices={[]} />);
      expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
    });

    it('handles single choice', () => {
      render(<ColorChipGroup {...defaultProps} choices={[defaultChoices[0]]} />);
      expect(screen.getAllByRole('radio').length).toBe(1);
    });

    it('handles many choices', () => {
      const manyChoices = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        code: `color_${i}`,
        name: `색상 ${i + 1}`,
        color: `#${i.toString(16).padStart(6, '0')}`,
      }));
      render(<ColorChipGroup {...defaultProps} choices={manyChoices} />);
      expect(screen.getAllByRole('radio').length).toBe(20);
    });

    it('handles selectedCode not in choices', () => {
      render(<ColorChipGroup {...defaultProps} selectedCode="nonexistent" />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });
  });
});
