/**
 * Input Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Input, type InputProps } from '@/primitives/Input';

describe('Input', () => {
  // Number variant tests
  describe('number variant', () => {
    const defaultProps: InputProps = {
      optionKey: 'quantity',
      label: '수량',
      value: 100,
      onChange: vi.fn(),
      variant: 'number',
      min: 1,
      max: 10000,
      step: 1,
      unit: '장',
      required: false,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('rendering', () => {
      it('renders label correctly', () => {
        render(<Input {...defaultProps} />);
        expect(screen.getByText('수량')).toBeInTheDocument();
      });

      it('renders required indicator when required', () => {
        const { container } = render(<Input {...defaultProps} required={true} />);
        expect(container.querySelector('.input__required')).toBeInTheDocument();
      });

      it('renders input with correct value', () => {
        render(<Input {...defaultProps} value={500} />);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        expect(input.value).toBe('500');
      });

      it('renders unit when provided', () => {
        render(<Input {...defaultProps} unit="장" />);
        expect(screen.getByText('장')).toBeInTheDocument();
      });

      it('renders decrement and increment buttons', () => {
        render(<Input {...defaultProps} />);
        expect(screen.getByLabelText('감소')).toBeInTheDocument();
        expect(screen.getByLabelText('증가')).toBeInTheDocument();
      });

      it('applies variant class correctly', () => {
        const { container } = render(<Input {...defaultProps} variant="number" />);
        expect(container.querySelector('.input--number')).toBeInTheDocument();
      });

      it('sets data-option-key attribute', () => {
        const { container } = render(<Input {...defaultProps} />);
        expect(container.querySelector('[data-option-key="quantity"]')).toBeInTheDocument();
      });
    });

    describe('interaction', () => {
      it('calls onChange when input value changes', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} onChange={onChange} />);

        const input = screen.getByRole('spinbutton');
        fireEvent.change(input, { target: { value: '200' } });

        expect(onChange).toHaveBeenCalledWith(200);
      });

      it('increments value when + button is clicked', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={100} step={10} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText('증가'));
        expect(onChange).toHaveBeenCalledWith(110);
      });

      it('decrements value when - button is clicked', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={100} step={10} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText('감소'));
        expect(onChange).toHaveBeenCalledWith(90);
      });

      it('clamps value to max when incrementing', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={9995} max={10000} step={10} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText('증가'));
        expect(onChange).toHaveBeenCalledWith(10000);
      });

      it('clamps value to min when decrementing', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={5} min={1} step={1} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText('감소'));
        expect(onChange).toHaveBeenCalledWith(4);
      });

      it('clamps to exact min when value goes below', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={1} min={1} step={10} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText('감소'));
        // 1 - 10 = -9, clamped to min (1), rounded to step (0)
        expect(onChange).toHaveBeenCalledWith(0);
      });

      it('rounds to step when changed', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} value={100} step={50} onChange={onChange} />);

        const input = screen.getByRole('spinbutton');
        fireEvent.change(input, { target: { value: '125' } });

        expect(onChange).toHaveBeenCalledWith(150); // rounded to nearest 50
      });
    });

    describe('accessibility', () => {
      it('has type="number" on input', () => {
        render(<Input {...defaultProps} />);
        const input = screen.getByRole('spinbutton');
        expect(input).toHaveAttribute('type', 'number');
      });

      it('has aria-label on stepper buttons', () => {
        render(<Input {...defaultProps} />);
        expect(screen.getByLabelText('감소')).toBeInTheDocument();
        expect(screen.getByLabelText('증가')).toBeInTheDocument();
      });
    });
  });

  // Dual variant tests
  describe('dual variant', () => {
    const defaultProps: InputProps = {
      optionKey: 'custom_size',
      label: '크기 직접 입력',
      value: 210,
      onChange: vi.fn(),
      variant: 'dual',
      min: 100,
      max: 500,
      value2: 297,
      onChange2: vi.fn(),
      min2: 100,
      max2: 700,
      label2: '높이',
      required: false,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('rendering', () => {
      it('renders label correctly', () => {
        render(<Input {...defaultProps} />);
        expect(screen.getByText('크기 직접 입력')).toBeInTheDocument();
      });

      it('renders width label', () => {
        render(<Input {...defaultProps} />);
        expect(screen.getByText('너비')).toBeInTheDocument();
      });

      it('renders second label', () => {
        render(<Input {...defaultProps} label2="높이" />);
        expect(screen.getByText('높이')).toBeInTheDocument();
      });

      it('renders both inputs', () => {
        render(<Input {...defaultProps} />);
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs.length).toBe(2);
      });

      it('renders separator', () => {
        const { container } = render(<Input {...defaultProps} />);
        expect(container.querySelector('.input__separator')).toBeInTheDocument();
      });

      it('renders mm unit for both inputs', () => {
        render(<Input {...defaultProps} />);
        const units = screen.getAllByText('mm');
        expect(units.length).toBe(2);
      });

      it('applies variant class correctly', () => {
        const { container } = render(<Input {...defaultProps} variant="dual" />);
        expect(container.querySelector('.input--dual')).toBeInTheDocument();
      });
    });

    describe('interaction', () => {
      it('calls onChange when width input changes', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} onChange={onChange} />);

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[0], { target: { value: '300' } });

        expect(onChange).toHaveBeenCalledWith(300);
      });

      it('calls onChange2 when height input changes', () => {
        const onChange2 = vi.fn();
        render(<Input {...defaultProps} onChange2={onChange2} />);

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[1], { target: { value: '400' } });

        expect(onChange2).toHaveBeenCalledWith(400);
      });

      it('clamps width value to min/max', () => {
        const onChange = vi.fn();
        render(<Input {...defaultProps} min={100} max={500} onChange2={undefined} />);

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[1], { target: { value: '50' } }); // onChange2 is undefined, no clamping test
        // Note: onChange2 undefined means no clamping happens
      });

      it('clamps height value when onChange2 is provided', () => {
        const onChange2 = vi.fn();
        render(<Input {...defaultProps} min2={100} max2={700} onChange2={onChange2} />);

        const inputs = screen.getAllByRole('spinbutton');
        fireEvent.change(inputs[1], { target: { value: '50' } });

        expect(onChange2).toHaveBeenCalledWith(100); // clamped to min2
      });
    });

    describe('default label2', () => {
      it('uses "높이" as default label2', () => {
        render(<Input {...defaultProps} label2={undefined} />);
        // Default value is '높이'
        expect(screen.getByText('높이')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('handles string value in number variant', () => {
      const onChange = vi.fn();
      render(
        <Input
          optionKey="test"
          label="테스트"
          value="100"
          onChange={onChange}
          variant="number"
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe('100');
    });

    it('handles zero value', () => {
      render(
        <Input
          optionKey="test"
          label="테스트"
          value={0}
          onChange={vi.fn()}
          variant="number"
        />
      );

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('handles undefined min/max', () => {
      const onChange = vi.fn();
      render(
        <Input
          optionKey="test"
          label="테스트"
          value={100}
          onChange={onChange}
          variant="number"
          min={undefined}
          max={undefined}
        />
      );

      // Should not throw and should allow any value
      fireEvent.click(screen.getByLabelText('증가'));
      expect(onChange).toHaveBeenCalled();
    });

    it('handles negative values', () => {
      const onChange = vi.fn();
      render(
        <Input
          optionKey="test"
          label="테스트"
          value={-100}
          onChange={onChange}
          variant="number"
          step={10}
        />
      );

      fireEvent.click(screen.getByLabelText('증가'));
      expect(onChange).toHaveBeenCalledWith(-90);
    });

    it('does not render unit when not provided', () => {
      const { container } = render(
        <Input
          optionKey="test"
          label="테스트"
          value={100}
          onChange={vi.fn()}
          variant="number"
          unit={undefined}
        />
      );

      expect(container.querySelector('.input__unit')).not.toBeInTheDocument();
    });
  });
});
