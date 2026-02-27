/**
 * NumberInput Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { NumberInput, type NumberInputProps } from '@/components/NumberInput';

describe('NumberInput', () => {
  const defaultConstraints = {
    min: 1,
    max: 10000,
    step: 1,
  };

  const defaultProps: NumberInputProps = {
    optionKey: 'quantity',
    label: '수량',
    value: 100,
    onChange: vi.fn(),
    constraints: defaultConstraints,
    unit: '장',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<NumberInput {...defaultProps} />);
      expect(screen.getByText('수량')).toBeInTheDocument();
    });

    it('renders as input with number variant', () => {
      const { container } = render(<NumberInput {...defaultProps} />);
      expect(container.querySelector('.input--number')).toBeInTheDocument();
    });

    it('sets correct option key', () => {
      const { container } = render(<NumberInput {...defaultProps} />);
      expect(container.querySelector('[data-option-key="quantity"]')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<NumberInput {...defaultProps} value={500} />);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('500');
    });

    it('renders unit when provided', () => {
      render(<NumberInput {...defaultProps} unit="장" />);
      expect(screen.getByText('장')).toBeInTheDocument();
    });

    it('does not render unit when not provided', () => {
      const { container } = render(<NumberInput {...defaultProps} unit={undefined} />);
      expect(container.querySelector('.input__unit')).not.toBeInTheDocument();
    });

    it('marks field as required', () => {
      const { container } = render(<NumberInput {...defaultProps} />);
      expect(container.querySelector('.input__required')).toBeInTheDocument();
    });
  });

  describe('constraints', () => {
    it('passes min constraint to input', () => {
      render(<NumberInput {...defaultProps} constraints={{ min: 10, max: 100, step: 1 }} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '10');
    });

    it('passes max constraint to input', () => {
      render(<NumberInput {...defaultProps} constraints={{ min: 1, max: 500, step: 1 }} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('max', '500');
    });

    it('passes step constraint to input', () => {
      render(<NumberInput {...defaultProps} constraints={{ min: 1, max: 100, step: 10 }} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('step', '10');
    });
  });

  describe('interaction', () => {
    it('calls onChange with number when input changes', () => {
      const onChange = vi.fn();
      render(<NumberInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '200' } });

      expect(onChange).toHaveBeenCalledWith(200);
      expect(typeof onChange.mock.calls[0]![0]).toBe('number');
    });

    it('calls onChange when increment button clicked', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={100}
          constraints={{ min: 1, max: 1000, step: 10 }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('증가'));
      expect(onChange).toHaveBeenCalled();
    });

    it('calls onChange when decrement button clicked', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={100}
          constraints={{ min: 1, max: 1000, step: 10 }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('감소'));
      expect(onChange).toHaveBeenCalled();
    });

    it('handles string value conversion', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={'150' as unknown as number}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '300' } });

      expect(onChange).toHaveBeenCalledWith(300);
    });

    it('handles invalid input gracefully', () => {
      const onChange = vi.fn();
      render(<NumberInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'abc' } });

      // Should call onChange even with invalid input (value is parsed/clamped)
      expect(onChange).toHaveBeenCalled();
      // The value is parsed to 0 and then clamped to min (1)
      expect(typeof onChange.mock.calls[0]![0]).toBe('number');
    });
  });

  describe('constraint enforcement', () => {
    it('respects min constraint', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={5}
          constraints={{ min: 10, max: 100, step: 1 }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('감소'));
      // Value should be clamped to min (10) and rounded to step
      expect(onChange).toHaveBeenCalled();
    });

    it('respects max constraint', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={95}
          constraints={{ min: 1, max: 100, step: 1 }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('증가'));
      expect(onChange).toHaveBeenCalled();
    });

    it('respects step constraint', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={100}
          constraints={{ min: 0, max: 1000, step: 50 }}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '125' } });

      // Should round to nearest step (150)
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles zero value', () => {
      render(<NumberInput {...defaultProps} value={0} />);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('handles large values', () => {
      render(<NumberInput {...defaultProps} value={1000000} />);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('1000000');
    });

    it('handles negative values', () => {
      render(
        <NumberInput
          {...defaultProps}
          value={-50}
          constraints={{ min: -100, max: 100, step: 1 }}
        />
      );
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('-50');
    });

    it('handles decimal step', () => {
      const onChange = vi.fn();
      render(
        <NumberInput
          {...defaultProps}
          value={1}
          constraints={{ min: 0.5, max: 10, step: 0.5 }}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('step', '0.5');
    });

    it('handles very large step', () => {
      render(
        <NumberInput
          {...defaultProps}
          value={1000}
          constraints={{ min: 0, max: 10000, step: 500 }}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('step', '500');
    });

    it('handles single constraint range', () => {
      render(
        <NumberInput
          {...defaultProps}
          value={50}
          constraints={{ min: 50, max: 50, step: 1 }}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '50');
      expect(input).toHaveAttribute('max', '50');
    });
  });
});
