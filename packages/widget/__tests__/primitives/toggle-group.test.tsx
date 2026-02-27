/**
 * ToggleGroup Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { ToggleGroup, type ToggleGroupProps, type ToggleGroupItem } from '@/primitives/ToggleGroup';

describe('ToggleGroup', () => {
  const defaultItems: ToggleGroupItem[] = [
    { code: 'single', name: '단면' },
    { code: 'double', name: '양면' },
    { code: 'none', name: '인쇄안함' },
  ];

  const defaultProps: ToggleGroupProps = {
    optionKey: 'print_type',
    label: '인쇄 방식',
    items: defaultItems,
    value: null,
    onChange: vi.fn(),
    variant: 'default',
    required: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<ToggleGroup {...defaultProps} />);
      expect(screen.getByText('인쇄 방식')).toBeInTheDocument();
    });

    it('renders all items', () => {
      render(<ToggleGroup {...defaultProps} />);
      expect(screen.getByText('단면')).toBeInTheDocument();
      expect(screen.getByText('양면')).toBeInTheDocument();
      expect(screen.getByText('인쇄안함')).toBeInTheDocument();
    });

    it('renders required indicator when required', () => {
      render(<ToggleGroup {...defaultProps} required={true} />);
      const container = screen.getByRole('group');
      expect(container.querySelector('.toggle-group__required')).toBeInTheDocument();
    });

    it('does not render required indicator when not required', () => {
      render(<ToggleGroup {...defaultProps} required={false} />);
      const container = screen.getByRole('group');
      expect(container.querySelector('.toggle-group__required')).not.toBeInTheDocument();
    });

    it('applies variant class correctly', () => {
      const { container, rerender } = render(<ToggleGroup {...defaultProps} variant="default" />);
      expect(container.querySelector('.toggle-group--default')).toBeInTheDocument();

      rerender(<ToggleGroup {...defaultProps} variant="compact" />);
      expect(container.querySelector('.toggle-group--compact')).toBeInTheDocument();
    });

    it('sets data-option-key attribute', () => {
      render(<ToggleGroup {...defaultProps} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('data-option-key', 'print_type');
    });

    it('sets aria-label on group', () => {
      render(<ToggleGroup {...defaultProps} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', '인쇄 방식');
    });
  });

  describe('selection state', () => {
    it('shows no item selected when value is null', () => {
      render(<ToggleGroup {...defaultProps} value={null} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('shows correct item as selected', () => {
      render(<ToggleGroup {...defaultProps} value="double" />);
      const doubleButton = screen.getByText('양면').closest('button');
      expect(doubleButton).toHaveAttribute('aria-pressed', 'true');
      expect(doubleButton).toHaveClass('toggle-group__item--selected');
    });

    it('updates selection when value prop changes', () => {
      const { rerender } = render(<ToggleGroup {...defaultProps} value="single" />);
      expect(screen.getByText('단면').closest('button')).toHaveAttribute('aria-pressed', 'true');

      rerender(<ToggleGroup {...defaultProps} value="double" />);
      expect(screen.getByText('단면').closest('button')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('양면').closest('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('interaction', () => {
    it('calls onChange when item is clicked', () => {
      const onChange = vi.fn();
      render(<ToggleGroup {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByText('단면'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('single');
    });

    it('does not call onChange when disabled item is clicked', () => {
      const onChange = vi.fn();
      const itemsWithDisabled: ToggleGroupItem[] = [
        { code: 'single', name: '단면' },
        { code: 'double', name: '양면', disabled: true },
        { code: 'none', name: '인쇄안함' },
      ];

      render(<ToggleGroup {...defaultProps} items={itemsWithDisabled} onChange={onChange} />);

      fireEvent.click(screen.getByText('양면'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls onChange even when clicking the already selected item', () => {
      const onChange = vi.fn();
      render(<ToggleGroup {...defaultProps} value="single" onChange={onChange} />);

      fireEvent.click(screen.getByText('단면'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('single');
    });
  });

  describe('disabled state', () => {
    it('disables items with disabled: true', () => {
      const itemsWithDisabled: ToggleGroupItem[] = [
        { code: 'single', name: '단면' },
        { code: 'double', name: '양면', disabled: true },
      ];

      render(<ToggleGroup {...defaultProps} items={itemsWithDisabled} />);

      const singleButton = screen.getByText('단면').closest('button');
      const doubleButton = screen.getByText('양면').closest('button');

      expect(singleButton).not.toBeDisabled();
      expect(doubleButton).toBeDisabled();
    });

    it('applies disabled visual state', () => {
      const itemsWithDisabled: ToggleGroupItem[] = [
        { code: 'single', name: '단면' },
        { code: 'double', name: '양면', disabled: true },
      ];

      render(<ToggleGroup {...defaultProps} items={itemsWithDisabled} />);

      const doubleButton = screen.getByText('양면').closest('button');
      expect(doubleButton).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has role="group"', () => {
      render(<ToggleGroup {...defaultProps} />);
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('has aria-pressed on buttons', () => {
      render(<ToggleGroup {...defaultProps} value="single" />);
      const buttons = screen.getAllByRole('button');

      const states = buttons.map((btn) => btn.getAttribute('aria-pressed'));
      expect(states).toContain('true');
      expect(states).toContain('false');
    });

    it('has type="button" on all buttons', () => {
      render(<ToggleGroup {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('variants', () => {
    it('applies default variant class', () => {
      const { container } = render(<ToggleGroup {...defaultProps} variant="default" />);
      expect(container.querySelector('.toggle-group--default')).toBeInTheDocument();
    });

    it('applies compact variant class', () => {
      const { container } = render(<ToggleGroup {...defaultProps} variant="compact" />);
      expect(container.querySelector('.toggle-group--compact')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const { container } = render(<ToggleGroup {...defaultProps} items={[]} />);
      expect(container.querySelector('.toggle-group__items')?.children.length).toBe(0);
    });

    it('handles single item', () => {
      const singleItem = [{ code: 'only', name: '유일한 옵션' }];
      render(<ToggleGroup {...defaultProps} items={singleItem} />);
      expect(screen.getByText('유일한 옵션')).toBeInTheDocument();
    });

    it('handles many items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        code: `option_${i}`,
        name: `옵션 ${i + 1}`,
      }));
      render(<ToggleGroup {...defaultProps} items={manyItems} />);
      expect(screen.getAllByRole('button').length).toBe(20);
    });

    it('handles value that does not match any item', () => {
      render(<ToggleGroup {...defaultProps} value="nonexistent" />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });
});
