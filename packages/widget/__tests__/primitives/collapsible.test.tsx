/**
 * Collapsible Primitive Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Collapsible, type CollapsibleProps } from '@/primitives/Collapsible';

describe('Collapsible', () => {
  const defaultProps: CollapsibleProps = {
    title: '후가공 옵션',
    defaultOpen: false,
    variant: 'title-bar',
    children: <div data-testid="content">하위 콘텐츠</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title correctly', () => {
      render(<Collapsible {...defaultProps} />);
      expect(screen.getByText('후가공 옵션')).toBeInTheDocument();
    });

    it('applies variant class correctly', () => {
      const { container } = render(<Collapsible {...defaultProps} variant="title-bar" />);
      expect(container.querySelector('.collapsible--title-bar')).toBeInTheDocument();
    });

    it('renders children when open', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('does not render children when closed', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('is closed by default when defaultOpen is false', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('is open by default when defaultOpen is true', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('opens when header is clicked while closed', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');

      fireEvent.click(header);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('closes when header is clicked while open', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      const header = screen.getByRole('button');

      fireEvent.click(header);
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('toggles multiple times correctly', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');

      fireEvent.click(header);
      expect(screen.getByTestId('content')).toBeInTheDocument();

      fireEvent.click(header);
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();

      fireEvent.click(header);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('badge', () => {
    it('renders badge when badge prop is provided and > 0', () => {
      render(<Collapsible {...defaultProps} badge={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not render badge when badge is 0', () => {
      render(<Collapsible {...defaultProps} badge={0} />);
      const container = screen.getByRole('button');
      expect(container.querySelector('.collapsible__badge')).not.toBeInTheDocument();
    });

    it('does not render badge when badge is undefined', () => {
      render(<Collapsible {...defaultProps} badge={undefined} />);
      const container = screen.getByRole('button');
      expect(container.querySelector('.collapsible__badge')).not.toBeInTheDocument();
    });

    it('renders large badge numbers', () => {
      render(<Collapsible {...defaultProps} badge={99} />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('chevron', () => {
    it('shows right chevron when closed', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const chevron = screen.getByRole('button').querySelector('.collapsible__chevron');
      expect(chevron).toHaveTextContent('▶');
    });

    it('shows down chevron when open', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      const chevron = screen.getByRole('button').querySelector('.collapsible__chevron');
      expect(chevron).toHaveTextContent('▼');
    });

    it('changes chevron on toggle', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');
      const chevron = header.querySelector('.collapsible__chevron');

      expect(chevron).toHaveTextContent('▶');

      fireEvent.click(header);
      expect(chevron).toHaveTextContent('▼');

      fireEvent.click(header);
      expect(chevron).toHaveTextContent('▶');
    });
  });

  describe('header styling', () => {
    it('applies open class when expanded', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      const header = screen.getByRole('button');
      expect(header).toHaveClass('collapsible__header--open');
    });

    it('removes open class when collapsed', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');
      expect(header).not.toHaveClass('collapsible__header--open');
    });

    it('toggles open class correctly', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');

      fireEvent.click(header);
      expect(header).toHaveClass('collapsible__header--open');

      fireEvent.click(header);
      expect(header).not.toHaveClass('collapsible__header--open');
    });
  });

  describe('accessibility', () => {
    it('has button type on header', () => {
      render(<Collapsible {...defaultProps} />);
      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('type', 'button');
    });

    it('has aria-expanded attribute', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when toggled', () => {
      render(<Collapsible {...defaultProps} defaultOpen={false} />);
      const header = screen.getByRole('button');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-controls attribute', () => {
      render(<Collapsible {...defaultProps} />);
      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-controls');
    });

    it('aria-controls matches content id', () => {
      render(<Collapsible {...defaultProps} defaultOpen={true} />);
      const header = screen.getByRole('button');
      const contentId = header.getAttribute('aria-controls');
      const content = document.getElementById(contentId!);
      expect(content).toBeInTheDocument();
    });

    it('generates unique id from title', () => {
      render(<Collapsible {...defaultProps} title="후가공 옵션" defaultOpen={true} />);
      const content = screen.getByTestId('content').parentElement;
      expect(content?.id).toBe('collapsible-content-후가공-옵션');
    });
  });

  describe('children handling', () => {
    it('renders text children', () => {
      render(
        <Collapsible {...defaultProps} defaultOpen={true}>
          텍스트 콘텐츠
        </Collapsible>
      );
      expect(screen.getByText('텍스트 콘텐츠')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <Collapsible {...defaultProps} defaultOpen={true}>
          <span>첫 번째</span>
          <span>두 번째</span>
          <span>세 번째</span>
        </Collapsible>
      );
      expect(screen.getByText('첫 번째')).toBeInTheDocument();
      expect(screen.getByText('두 번째')).toBeInTheDocument();
      expect(screen.getByText('세 번째')).toBeInTheDocument();
    });

    it('renders nested components', () => {
      render(
        <Collapsible {...defaultProps} defaultOpen={true}>
          <div data-testid="nested">
            <span>중첩된 콘텐츠</span>
          </div>
        </Collapsible>
      );
      expect(screen.getByTestId('nested')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles title with special characters', () => {
      render(
        <Collapsible
          {...defaultProps}
          title="후가공 (박, 형압, 오시)"
          defaultOpen={true}
        />
      );
      const content = screen.getByTestId('content').parentElement;
      expect(content?.id).toBe('collapsible-content-후가공-(박,-형압,-오시)');
    });

    it('handles empty children', () => {
      const { container } = render(
        <Collapsible {...defaultProps} defaultOpen={true}>
          {null}
        </Collapsible>
      );
      expect(container.querySelector('.collapsible__content')).toBeInTheDocument();
    });

    it('handles very long title', () => {
      const longTitle = '매우 긴 제목'.repeat(20);
      render(<Collapsible {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles title with spaces', () => {
      render(
        <Collapsible
          {...defaultProps}
          title="제목에   여러    공백이   있습니다"
          defaultOpen={true}
        />
      );
      const content = screen.getByTestId('content').parentElement;
      // Multiple spaces should be replaced with single hyphen
      expect(content?.id).toMatch(/collapsible-content-/);
    });
  });
});
