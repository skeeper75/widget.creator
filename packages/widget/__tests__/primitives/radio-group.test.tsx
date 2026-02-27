/**
 * RadioGroup Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { RadioGroup, type RadioGroupProps, type RadioGroupItem } from '@/primitives/RadioGroup';

describe('RadioGroup', () => {
  const colorChipItems: RadioGroupItem[] = [
    { code: 'white', name: '흰색', color: '#FFFFFF' },
    { code: 'ivory', name: '아이보리', color: '#FFFFF0' },
    { code: 'cream', name: '크림', color: '#FFFDD0' },
  ];

  const imageChipItems: RadioGroupItem[] = [
    { code: 'ring_black', name: '블랙 링', imageUrl: '/images/ring-black.png' },
    { code: 'ring_silver', name: '실버 링', imageUrl: '/images/ring-silver.png' },
    { code: 'ring_gold', name: '골드 링', imageUrl: '/images/ring-gold.png' },
  ];

  const defaultProps: RadioGroupProps = {
    optionKey: 'paper_color',
    label: '용지 색상',
    items: colorChipItems,
    value: null,
    onChange: vi.fn(),
    variant: 'color-chip',
    required: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<RadioGroup {...defaultProps} />);
      expect(screen.getByText('용지 색상')).toBeInTheDocument();
    });

    it('renders all items', () => {
      render(<RadioGroup {...defaultProps} />);
      expect(screen.getByText('흰색')).toBeInTheDocument();
      expect(screen.getByText('아이보리')).toBeInTheDocument();
      expect(screen.getByText('크림')).toBeInTheDocument();
    });

    it('renders as fieldset', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);
      expect(container.querySelector('fieldset')).toBeInTheDocument();
    });

    it('renders required indicator when required', () => {
      const { container } = render(<RadioGroup {...defaultProps} required={true} />);
      const fieldset = container.querySelector('fieldset');
      expect(fieldset?.querySelector('.radio-group__required')).toBeInTheDocument();
    });

    it('applies variant class correctly', () => {
      const { container } = render(<RadioGroup {...defaultProps} variant="color-chip" />);
      expect(container.querySelector('.radio-group--color-chip')).toBeInTheDocument();
    });

    it('sets data-option-key attribute', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);
      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toHaveAttribute('data-option-key', 'paper_color');
    });
  });

  describe('color-chip variant', () => {
    it('renders color chips with correct background color', () => {
      const { container } = render(<RadioGroup {...defaultProps} variant="color-chip" />);

      const chips = container.querySelectorAll('.radio-group__color-chip');
      expect(chips.length).toBe(3);

      expect(chips[0]).toHaveStyle({ backgroundColor: '#FFFFFF' });
      expect(chips[1]).toHaveStyle({ backgroundColor: '#FFFFF0' });
      expect(chips[2]).toHaveStyle({ backgroundColor: '#FFFDD0' });
    });

    it('does not render color chip when item has no color', () => {
      const itemsWithoutColor: RadioGroupItem[] = [
        { code: 'item1', name: '아이템 1' },
        { code: 'item2', name: '아이템 2', color: '#FF0000' },
      ];

      const { container } = render(
        <RadioGroup {...defaultProps} items={itemsWithoutColor} variant="color-chip" />
      );

      const chips = container.querySelectorAll('.radio-group__color-chip');
      expect(chips.length).toBe(1);
    });
  });

  describe('image-chip variant', () => {
    it('renders images with correct src', () => {
      render(<RadioGroup {...defaultProps} items={imageChipItems} variant="image-chip" />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);

      expect(images[0]).toHaveAttribute('src', '/images/ring-black.png');
      expect(images[1]).toHaveAttribute('src', '/images/ring-silver.png');
      expect(images[2]).toHaveAttribute('src', '/images/ring-gold.png');
    });

    it('renders images with alt text', () => {
      render(<RadioGroup {...defaultProps} items={imageChipItems} variant="image-chip" />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('alt', '블랙 링');
      expect(images[1]).toHaveAttribute('alt', '실버 링');
      expect(images[2]).toHaveAttribute('alt', '골드 링');
    });

    it('does not render image when item has no imageUrl', () => {
      const itemsWithoutImage: RadioGroupItem[] = [
        { code: 'item1', name: '아이템 1' },
        { code: 'item2', name: '아이템 2', imageUrl: '/image.png' },
      ];

      render(<RadioGroup {...defaultProps} items={itemsWithoutImage} variant="image-chip" />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBe(1);
    });

    it('applies image-chip class', () => {
      const { container } = render(
        <RadioGroup {...defaultProps} items={imageChipItems} variant="image-chip" />
      );
      expect(container.querySelector('.radio-group--image-chip')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows no item selected when value is null', () => {
      render(<RadioGroup {...defaultProps} value={null} />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });

    it('shows correct item as selected', () => {
      render(<RadioGroup {...defaultProps} value="ivory" />);
      const radios = screen.getAllByRole('radio');

      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
      expect(radios[2]).not.toBeChecked();
    });

    it('applies selected class to label', () => {
      const { container } = render(<RadioGroup {...defaultProps} value="ivory" />);
      const selectedLabel = container.querySelector('.radio-group__item--selected');
      expect(selectedLabel).toBeInTheDocument();
    });

    it('updates selection when value prop changes', () => {
      const { rerender } = render(<RadioGroup {...defaultProps} value="white" />);
      expect(screen.getAllByRole('radio')[0]).toBeChecked();

      rerender(<RadioGroup {...defaultProps} value="cream" />);
      expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
      expect(screen.getAllByRole('radio')[2]).toBeChecked();
    });
  });

  describe('interaction', () => {
    it('calls onChange when item is clicked', () => {
      const onChange = vi.fn();
      render(<RadioGroup {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByLabelText('아이보리'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('ivory');
    });

    it('does not call onChange when disabled item is clicked', () => {
      const onChange = vi.fn();
      const itemsWithDisabled: RadioGroupItem[] = [
        { code: 'white', name: '흰색', color: '#FFFFFF' },
        { code: 'ivory', name: '아이보리', color: '#FFFFF0', disabled: true },
      ];

      render(<RadioGroup {...defaultProps} items={itemsWithDisabled} onChange={onChange} />);

      fireEvent.click(screen.getByLabelText('아이보리'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('disables items with disabled: true', () => {
      const itemsWithDisabled: RadioGroupItem[] = [
        { code: 'white', name: '흰색', color: '#FFFFFF' },
        { code: 'ivory', name: '아이보리', color: '#FFFFF0', disabled: true },
      ];

      render(<RadioGroup {...defaultProps} items={itemsWithDisabled} />);

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).not.toBeDisabled();
      expect(radios[1]).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('uses fieldset for grouping', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);
      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toBeInTheDocument();
    });

    it('uses legend for label', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);
      const legend = container.querySelector('legend');
      expect(legend).toHaveTextContent('용지 색상');
    });

    it('has type="radio" on inputs', () => {
      render(<RadioGroup {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute('type', 'radio');
      });
    });

    it('groups radios by name', () => {
      render(<RadioGroup {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      const names = radios.map((r) => r.getAttribute('name'));
      expect(new Set(names).size).toBe(1); // All should have same name
    });

    it('has unique ids for each radio', () => {
      render(<RadioGroup {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      const ids = radios.map((r) => r.getAttribute('id'));
      expect(new Set(ids).size).toBe(3); // All unique
    });

    it('associates labels with radios via htmlFor', () => {
      render(<RadioGroup {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      const labels = document.querySelectorAll('label');

      radios.forEach((radio, index) => {
        expect(labels[index]!.getAttribute('for')).toBe(radio.getAttribute('id'));
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const { container } = render(<RadioGroup {...defaultProps} items={[]} />);
      expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
    });

    it('handles single item', () => {
      render(<RadioGroup {...defaultProps} items={[colorChipItems[0]!]} />);
      expect(screen.getAllByRole('radio').length).toBe(1);
    });

    it('handles many items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        code: `color_${i}`,
        name: `색상 ${i + 1}`,
        color: `#${i.toString(16).padStart(6, '0')}`,
      }));
      render(<RadioGroup {...defaultProps} items={manyItems} />);
      expect(screen.getAllByRole('radio').length).toBe(20);
    });

    it('handles value that does not match any item', () => {
      render(<RadioGroup {...defaultProps} value="nonexistent" />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeChecked();
      });
    });
  });
});
