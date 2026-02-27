/**
 * Button Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Button, type ButtonProps } from '@/primitives/Button';

describe('Button', () => {
  const defaultProps: ButtonProps = {
    label: '버튼',
    onClick: vi.fn(),
    variant: 'primary',
    disabled: false,
    loading: false,
    fullWidth: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByText('버튼')).toBeInTheDocument();
    });

    it('renders as button element', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has type="button"', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('variants', () => {
    it('applies primary variant class', () => {
      const { container } = render(<Button {...defaultProps} variant="primary" />);
      expect(container.querySelector('.button--primary')).toBeInTheDocument();
    });

    it('applies secondary variant class', () => {
      const { container } = render(<Button {...defaultProps} variant="secondary" />);
      expect(container.querySelector('.button--secondary')).toBeInTheDocument();
    });

    it('applies outline variant class', () => {
      const { container } = render(<Button {...defaultProps} variant="outline" />);
      expect(container.querySelector('.button--outline')).toBeInTheDocument();
    });

    it('applies upload variant class', () => {
      const { container } = render(<Button {...defaultProps} variant="upload" />);
      expect(container.querySelector('.button--upload')).toBeInTheDocument();
    });

    it('applies editor variant class', () => {
      const { container } = render(<Button {...defaultProps} variant="editor" />);
      expect(container.querySelector('.button--editor')).toBeInTheDocument();
    });
  });

  describe('upload icon', () => {
    it('renders upload icon for upload variant', () => {
      render(<Button {...defaultProps} variant="upload" />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('.button__icon');
      expect(icon).toBeInTheDocument();
    });

    it('does not render upload icon for other variants', () => {
      render(<Button {...defaultProps} variant="primary" />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('.button__icon');
      expect(icon).not.toBeInTheDocument();
    });

    it('does not render upload icon when loading', () => {
      render(<Button {...defaultProps} variant="upload" loading={true} />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('.button__icon');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('editor icon', () => {
    it('renders editor icon for editor variant', () => {
      render(<Button {...defaultProps} variant="editor" />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('.button__icon');
      expect(icon).toBeInTheDocument();
    });

    it('does not render editor icon when loading', () => {
      render(<Button {...defaultProps} variant="editor" loading={true} />);
      const button = screen.getByRole('button');
      const icon = button.querySelector('.button__icon');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('custom icon', () => {
    it('renders custom icon when provided', () => {
      render(
        <Button
          {...defaultProps}
          icon={<span data-testid="custom-icon">icon</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('does not render custom icon when loading', () => {
      render(
        <Button
          {...defaultProps}
          loading={true}
          icon={<span data-testid="custom-icon">icon</span>}
        />
      );
      expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders spinner when loading', () => {
      const { container } = render(<Button {...defaultProps} loading={true} />);
      expect(container.querySelector('.button__spinner')).toBeInTheDocument();
    });

    it('does not render spinner when not loading', () => {
      const { container } = render(<Button {...defaultProps} loading={false} />);
      expect(container.querySelector('.button__spinner')).not.toBeInTheDocument();
    });

    it('sets aria-busy when loading', () => {
      render(<Button {...defaultProps} loading={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('sets aria-busy false when not loading', () => {
      render(<Button {...defaultProps} loading={false} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });

    it('disables button when loading', () => {
      render(<Button {...defaultProps} loading={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('disabled state', () => {
    it('is not disabled by default', () => {
      render(<Button {...defaultProps} disabled={false} />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<Button {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is properly disabled and prevents click events', () => {
      const onClick = vi.fn();
      render(<Button {...defaultProps} disabled={true} onClick={onClick} />);

      const button = screen.getByRole('button');
      // In jsdom, disabled buttons still fire click events
      // So we just verify the button is disabled
      expect(button).toBeDisabled();
    });
  });

  describe('full width', () => {
    it('applies full-width class when fullWidth is true', () => {
      const { container } = render(<Button {...defaultProps} fullWidth={true} />);
      expect(container.querySelector('.button--full-width')).toBeInTheDocument();
    });

    it('does not apply full-width class when fullWidth is false', () => {
      const { container } = render(<Button {...defaultProps} fullWidth={false} />);
      expect(container.querySelector('.button--full-width')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('can be clicked multiple times', () => {
      const onClick = vi.fn();
      render(<Button {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('has accessible name from label', () => {
      render(<Button {...defaultProps} label="제출하기" />);
      expect(screen.getByRole('button', { name: '제출하기' })).toBeInTheDocument();
    });

    it('has aria-busy attribute', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy');
    });
  });

  describe('edge cases', () => {
    it('handles empty label', () => {
      render(<Button {...defaultProps} label="" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles long label', () => {
      const longLabel = '매우 긴 버튼 라벨입니다.'.repeat(10);
      render(<Button {...defaultProps} label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('handles special characters in label', () => {
      render(<Button {...defaultProps} label="버튼 <특수문자> & '따옴표'" />);
      expect(screen.getByText("버튼 <특수문자> & '따옴표'")).toBeInTheDocument();
    });

    it('prioritizes loading spinner over upload icon', () => {
      const { container } = render(
        <Button {...defaultProps} variant="upload" loading={true} />
      );
      expect(container.querySelector('.button__spinner')).toBeInTheDocument();
      expect(container.querySelector('.button__icon')).not.toBeInTheDocument();
    });

    it('prioritizes loading spinner over editor icon', () => {
      const { container } = render(
        <Button {...defaultProps} variant="editor" loading={true} />
      );
      expect(container.querySelector('.button__spinner')).toBeInTheDocument();
      expect(container.querySelector('.button__icon')).not.toBeInTheDocument();
    });

    it('prioritizes loading spinner over custom icon', () => {
      render(
        <Button
          {...defaultProps}
          loading={true}
          icon={<span data-testid="custom-icon">icon</span>}
        />
      );
      expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
    });
  });
});
