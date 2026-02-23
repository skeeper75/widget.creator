/**
 * Select Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Select, type SelectProps, type SelectItem } from '@/primitives/Select';

describe('Select', () => {
  const defaultItems: SelectItem[] = [
    { code: 'paper_80g', name: '모조지 80g' },
    { code: 'paper_100g', name: '모조지 100g' },
    { code: 'paper_120g', name: '스노우지 120g' },
  ];

  const defaultChipItems: SelectItem[] = [
    { code: 'white', name: '흰색', chipColor: '#FFFFFF' },
    { code: 'ivory', name: '아이보리', chipColor: '#FFFFF0' },
    { code: 'cream', name: '크림', chipColor: '#FFFDD0' },
  ];

  const defaultProps: SelectProps = {
    optionKey: 'paper',
    label: '용지 선택',
    items: defaultItems,
    value: null,
    onChange: vi.fn(),
    variant: 'default',
    placeholder: '선택해주세요',
    required: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<Select {...defaultProps} />);
      expect(screen.getByText('용지 선택')).toBeInTheDocument();
    });

    it('renders placeholder when no value is selected', () => {
      render(<Select {...defaultProps} value={null} />);
      expect(screen.getByText('선택해주세요')).toBeInTheDocument();
    });

    it('renders selected item name when value is set', () => {
      render(<Select {...defaultProps} value="paper_100g" />);
      expect(screen.getByText('모조지 100g')).toBeInTheDocument();
    });

    it('renders required indicator when required', () => {
      render(<Select {...defaultProps} required={true} />);
      const container = screen.getByRole('button').closest('.select');
      expect(container?.querySelector('.select__required')).toBeInTheDocument();
    });

    it('applies variant class correctly', () => {
      const { container, rerender } = render(<Select {...defaultProps} variant="default" />);
      expect(container.querySelector('.select--default')).toBeInTheDocument();

      rerender(<Select {...defaultProps} variant="with-chip" items={defaultChipItems} />);
      expect(container.querySelector('.select--with-chip')).toBeInTheDocument();
    });

    it('sets data-option-key attribute', () => {
      render(<Select {...defaultProps} />);
      const container = screen.getByRole('button').closest('.select');
      expect(container).toHaveAttribute('data-option-key', 'paper');
    });
  });

  describe('dropdown behavior', () => {
    it('does not show dropdown initially', () => {
      render(<Select {...defaultProps} />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows dropdown when trigger is clicked', () => {
      render(<Select {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('hides dropdown when trigger is clicked again', () => {
      render(<Select {...defaultProps} />);
      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows all items in dropdown', () => {
      render(<Select {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('모조지 80g')).toBeInTheDocument();
      expect(screen.getByText('모조지 100g')).toBeInTheDocument();
      expect(screen.getByText('스노우지 120g')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      render(<Select {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onChange when item is selected', () => {
      const onChange = vi.fn();
      render(<Select {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('모조지 100g'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('paper_100g');
    });

    it('closes dropdown after selection', () => {
      const onChange = vi.fn();
      render(<Select {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('모조지 100g'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('highlights selected item in dropdown', () => {
      render(<Select {...defaultProps} value="paper_100g" />);
      fireEvent.click(screen.getByRole('button'));

      const selectedItem = screen.getByRole('option', { selected: true });
      expect(selectedItem).toHaveTextContent('모조지 100g');
    });
  });

  describe('with-chip variant', () => {
    it('renders chip next to selected item', () => {
      render(
        <Select
          {...defaultProps}
          variant="with-chip"
          items={defaultChipItems}
          value="ivory"
        />
      );

      const trigger = screen.getByRole('button');
      const chip = trigger.querySelector('.select__chip');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveStyle({ backgroundColor: '#FFFFF0' });
    });

    it('renders chips in dropdown options', () => {
      render(
        <Select
          {...defaultProps}
          variant="with-chip"
          items={defaultChipItems}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options[0].querySelector('.select__option-chip')).toBeInTheDocument();
    });

    it('does not render chip when item has no chipColor', () => {
      const itemsNoColor = [{ code: 'none', name: '색상 없음' }];
      render(
        <Select
          {...defaultProps}
          variant="with-chip"
          items={itemsNoColor}
          value="none"
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger.querySelector('.select__chip')).not.toBeInTheDocument();
    });
  });

  describe('disabled items', () => {
    it('renders disabled items with disabled class', () => {
      const itemsWithDisabled: SelectItem[] = [
        { code: 'paper_80g', name: '모조지 80g' },
        { code: 'paper_100g', name: '모조지 100g (품절)', disabled: true },
      ];

      render(<Select {...defaultProps} items={itemsWithDisabled} />);
      fireEvent.click(screen.getByRole('button'));

      const disabledOption = screen.getByText('모조지 100g (품절)').closest('li');
      expect(disabledOption).toBeInTheDocument();
    });

    it('does not call onChange when disabled item is clicked', () => {
      const onChange = vi.fn();
      const itemsWithDisabled: SelectItem[] = [
        { code: 'paper_80g', name: '모조지 80g' },
        { code: 'paper_100g', name: '모조지 100g (품절)', disabled: true },
      ];

      render(<Select {...defaultProps} items={itemsWithDisabled} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('모조지 100g (품절)'));

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument(); // Still open
    });
  });

  describe('accessibility', () => {
    it('has aria-expanded on trigger', () => {
      render(<Select {...defaultProps} />);
      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-haspopup="listbox" on trigger', () => {
      render(<Select {...defaultProps} />);
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has role="listbox" on dropdown', () => {
      render(<Select {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('has role="option" on items', () => {
      render(<Select {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getAllByRole('option').length).toBe(3);
    });

    it('has aria-selected on options', () => {
      render(<Select {...defaultProps} value="paper_100g" />);
      fireEvent.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('edge cases', () => {
    it('handles empty items array', () => {
      render(<Select {...defaultProps} items={[]} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('handles single item', () => {
      render(<Select {...defaultProps} items={[defaultItems[0]]} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getAllByRole('option').length).toBe(1);
    });

    it('handles value that does not match any item', () => {
      render(<Select {...defaultProps} value="nonexistent" />);
      expect(screen.getByText('선택해주세요')).toBeInTheDocument();
    });

    it('uses custom placeholder', () => {
      render(<Select {...defaultProps} placeholder="용지를 선택하세요" value={null} />);
      expect(screen.getByText('용지를 선택하세요')).toBeInTheDocument();
    });
  });
});
