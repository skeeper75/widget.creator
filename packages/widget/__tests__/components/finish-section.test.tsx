/**
 * FinishSection Domain Component Tests
 * @see SPEC-WIDGET-SDK-001 Section 4.4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { FinishSection, type FinishSectionProps } from '@/components/FinishSection';
import { createMockPostProcessGroup } from '../utils/mock-factories';

describe('FinishSection', () => {
  const mockGroups = [
    {
      key: 'foil',
      label: '박',
      options: [
        { id: 1, optionKey: 'foil', code: 'gold', name: '금박', sortOrder: 1 },
        { id: 2, optionKey: 'foil', code: 'silver', name: '은박', sortOrder: 2 },
      ],
      selectedCode: null,
    },
    {
      key: 'embossing',
      label: '형압',
      options: [
        { id: 3, optionKey: 'embossing', code: 'emboss', name: '볼록', sortOrder: 1 },
        { id: 4, optionKey: 'embossing', code: 'deboss', name: '오목', sortOrder: 2 },
      ],
      selectedCode: null,
    },
    {
      key: 'creasing',
      label: '오시',
      options: [
        { id: 5, optionKey: 'creasing', code: 'horizontal', name: '가로', sortOrder: 1 },
        { id: 6, optionKey: 'creasing', code: 'vertical', name: '세로', sortOrder: 2 },
      ],
      selectedCode: 'horizontal',
    },
  ];

  const defaultProps: FinishSectionProps = {
    groups: mockGroups,
    onOptionChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders collapsible section', () => {
      render(<FinishSection {...defaultProps} />);
      expect(screen.getByText('후가공')).toBeInTheDocument();
    });

    it('is collapsed by default', () => {
      render(<FinishSection {...defaultProps} defaultOpen={false} />);
      // Content should not be visible
      expect(screen.queryByText('박')).not.toBeInTheDocument();
    });

    it('expands when header is clicked', () => {
      render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('박')).toBeInTheDocument();
    });

    it('renders all group labels when expanded', () => {
      render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('박')).toBeInTheDocument();
      expect(screen.getByText('형압')).toBeInTheDocument();
      expect(screen.getByText('오시')).toBeInTheDocument();
    });

    it('renders "없음" option for each group', () => {
      render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      const noneOptions = screen.getAllByText('없음');
      expect(noneOptions.length).toBe(3); // One for each group
    });
  });

  describe('badge', () => {
    it('shows badge count of selected options', () => {
      // One group has selectedCode set
      render(<FinishSection {...defaultProps} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('updates badge when selections change', () => {
      const { rerender } = render(<FinishSection {...defaultProps} />);
      expect(screen.getByText('1')).toBeInTheDocument();

      const updatedGroups = mockGroups.map((g) => ({
        ...g,
        selectedCode: g.key === 'foil' ? 'gold' : g.selectedCode,
      }));

      rerender(<FinishSection {...defaultProps} groups={updatedGroups} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows no badge when no selections', () => {
      const noSelectionGroups = mockGroups.map((g) => ({
        ...g,
        selectedCode: null,
      }));
      render(<FinishSection {...defaultProps} groups={noSelectionGroups} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
      const badge = screen.getByRole('button').querySelector('.collapsible__badge');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('group options', () => {
    it('renders all options for each group', () => {
      render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('금박')).toBeInTheDocument();
      expect(screen.getByText('은박')).toBeInTheDocument();
      expect(screen.getByText('볼록')).toBeInTheDocument();
      expect(screen.getByText('오목')).toBeInTheDocument();
    });

    it('uses compact variant for toggle groups', () => {
      const { container } = render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(container.querySelector('.toggle-group--compact')).toBeInTheDocument();
    });

    it('shows selected option as active', () => {
      render(<FinishSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      // 오시 group has 'horizontal' selected
      const horizontalButton = screen.getByText('가로').closest('button');
      expect(horizontalButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('interaction', () => {
    it('calls onOptionChange when option is selected', () => {
      const onOptionChange = vi.fn();
      render(<FinishSection {...defaultProps} onOptionChange={onOptionChange} />);
      fireEvent.click(screen.getByRole('button'));

      fireEvent.click(screen.getByText('금박'));
      expect(onOptionChange).toHaveBeenCalledWith('foil', 'gold');
    });

    it('calls onOptionChange with correct group key and code', () => {
      const onOptionChange = vi.fn();
      render(<FinishSection {...defaultProps} onOptionChange={onOptionChange} />);
      fireEvent.click(screen.getByRole('button'));

      fireEvent.click(screen.getByText('오목'));
      expect(onOptionChange).toHaveBeenCalledWith('embossing', 'deboss');
    });

    it('allows selecting "없음" to clear selection', () => {
      const onOptionChange = vi.fn();
      render(<FinishSection {...defaultProps} onOptionChange={onOptionChange} />);
      fireEvent.click(screen.getByRole('button'));

      const noneButtons = screen.getAllByText('없음');
      fireEvent.click(noneButtons[2]); // 오시 group
      expect(onOptionChange).toHaveBeenCalledWith('creasing', '');
    });
  });

  describe('edge cases', () => {
    it('handles empty groups array', () => {
      const { container } = render(<FinishSection {...defaultProps} groups={[]} />);
      fireEvent.click(screen.getByRole('button'));

      expect(container.querySelector('.finish-section__content')).toBeInTheDocument();
    });

    it('handles single group', () => {
      render(<FinishSection {...defaultProps} groups={[mockGroups[0]]} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('박')).toBeInTheDocument();
      expect(screen.queryByText('형압')).not.toBeInTheDocument();
    });

    it('handles group with empty options', () => {
      const groupsWithEmpty: FinishSectionProps['groups'] = [
        {
          key: 'empty',
          label: '빈 그룹',
          options: [],
          selectedCode: null,
        },
      ];
      render(<FinishSection {...defaultProps} groups={groupsWithEmpty} />);
      fireEvent.click(screen.getByRole('button'));

      // Should still show "없음" option
      expect(screen.getByText('빈 그룹')).toBeInTheDocument();
      expect(screen.getByText('없음')).toBeInTheDocument();
    });

    it('handles disabled options', () => {
      const groupsWithDisabled = [
        {
          key: 'test',
          label: '테스트',
          options: [
            { id: 1, optionKey: 'test', code: 'opt1', name: '옵션 1', sortOrder: 1 },
            {
              id: 2,
              optionKey: 'test',
              code: 'opt2',
              name: '옵션 2',
              sortOrder: 2,
              disabled: true,
            },
          ],
          selectedCode: null,
        },
      ];
      render(<FinishSection {...defaultProps} groups={groupsWithDisabled} />);
      fireEvent.click(screen.getByRole('button'));

      const disabledButton = screen.getByText('옵션 2').closest('button');
      expect(disabledButton).toBeDisabled();
    });
  });
});
