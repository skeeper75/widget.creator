/**
 * DualInput Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { DualInput, type DualInputProps } from '@/components/DualInput';

describe('DualInput', () => {
  const defaultConstraints = {
    minW: 100,
    maxW: 500,
    minH: 100,
    maxH: 700,
  };

  const defaultProps: DualInputProps = {
    optionKey: 'custom_size',
    label: '크기 직접 입력',
    width: 210,
    height: 297,
    onWidthChange: vi.fn(),
    onHeightChange: vi.fn(),
    constraints: defaultConstraints,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with correct label', () => {
      render(<DualInput {...defaultProps} />);
      expect(screen.getByText('크기 직접 입력')).toBeInTheDocument();
    });

    it('renders as input with dual variant', () => {
      const { container } = render(<DualInput {...defaultProps} />);
      expect(container.querySelector('.input--dual')).toBeInTheDocument();
    });

    it('sets correct option key', () => {
      const { container } = render(<DualInput {...defaultProps} />);
      expect(
        container.querySelector('[data-option-key="custom_size"]')
      ).toBeInTheDocument();
    });

    it('renders width and height labels', () => {
      render(<DualInput {...defaultProps} />);
      expect(screen.getByText('너비')).toBeInTheDocument();
      expect(screen.getByText('높이')).toBeInTheDocument();
    });

    it('renders both inputs', () => {
      render(<DualInput {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(2);
    });

    it('displays current width value', () => {
      render(<DualInput {...defaultProps} width={300} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0]!.value).toBe('300');
    });

    it('displays current height value', () => {
      render(<DualInput {...defaultProps} height={400} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[1]!.value).toBe('400');
    });

    it('marks field as required', () => {
      const { container } = render(<DualInput {...defaultProps} />);
      expect(container.querySelector('.input__required')).toBeInTheDocument();
    });
  });

  describe('constraints', () => {
    it('passes width constraints to input', () => {
      render(
        <DualInput
          {...defaultProps}
          constraints={{ minW: 150, maxW: 600, minH: 100, maxH: 700 }}
        />
      );
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveAttribute('min', '150');
      expect(inputs[0]).toHaveAttribute('max', '600');
    });

    it('passes height constraints to input', () => {
      render(
        <DualInput
          {...defaultProps}
          constraints={{ minW: 100, maxW: 500, minH: 200, maxH: 800 }}
        />
      );
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[1]).toHaveAttribute('min', '200');
      expect(inputs[1]).toHaveAttribute('max', '800');
    });
  });

  describe('interaction', () => {
    it('calls onWidthChange when width changes', () => {
      const onWidthChange = vi.fn();
      render(<DualInput {...defaultProps} onWidthChange={onWidthChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0]!, { target: { value: '400' } });

      expect(onWidthChange).toHaveBeenCalledWith(400);
    });

    it('calls onHeightChange when height changes', () => {
      const onHeightChange = vi.fn();
      render(<DualInput {...defaultProps} onHeightChange={onHeightChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1]!, { target: { value: '500' } });

      expect(onHeightChange).toHaveBeenCalledWith(500);
    });

    it('handles string value conversion for width', () => {
      const onWidthChange = vi.fn();
      render(<DualInput {...defaultProps} onWidthChange={onWidthChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0]!, { target: { value: '350' } });

      expect(onWidthChange).toHaveBeenCalledWith(350);
      expect(typeof onWidthChange.mock.calls[0]![0]).toBe('number');
    });

    it('handles invalid input gracefully', () => {
      const onWidthChange = vi.fn();
      render(<DualInput {...defaultProps} onWidthChange={onWidthChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0]!, { target: { value: 'abc' } });

      expect(onWidthChange).toHaveBeenCalledWith(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero values', () => {
      render(<DualInput {...defaultProps} width={0} height={0} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0]!.value).toBe('0');
      expect(inputs[1]!.value).toBe('0');
    });

    it('handles large values', () => {
      render(<DualInput {...defaultProps} width={10000} height={10000} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0]!.value).toBe('10000');
      expect(inputs[1]!.value).toBe('10000');
    });

    it('handles negative values', () => {
      render(
        <DualInput
          {...defaultProps}
          width={-100}
          height={-200}
          constraints={{ minW: -500, maxW: 500, minH: -500, maxH: 500 }}
        />
      );
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0]!.value).toBe('-100');
      expect(inputs[1]!.value).toBe('-200');
    });

    it('handles equal min and max constraints', () => {
      render(
        <DualInput
          {...defaultProps}
          constraints={{ minW: 200, maxW: 200, minH: 300, maxH: 300 }}
        />
      );
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveAttribute('min', '200');
      expect(inputs[0]).toHaveAttribute('max', '200');
    });
  });
});
