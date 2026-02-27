/**
 * PaperSelect Domain Component
 * Uses Select with chip for paper selection
 * @see SPEC-WIDGET-SDK-001 Section 4.4.2
 */

import { FunctionalComponent } from 'preact';
import { Select, type SelectItem } from '../primitives';
import type { PaperOption } from '../types';

export interface PaperSelectProps {
  /** Papers available for this product */
  papers: PaperOption[];
  /** Currently selected paper ID */
  selectedPaperId: number | null;
  /** Selection handler */
  onSelect: (paperId: number) => void;
  /** Cover type filter: 'inner' | 'cover' | null */
  coverType?: 'inner' | 'cover' | null;
}

/**
 * PaperSelect - Paper selection with color chip
 * Data source: papers JOIN paper_product_mapping
 * Chip color: derived from paper visual property or static mapping
 */
export const PaperSelect: FunctionalComponent<PaperSelectProps> = ({
  papers,
  selectedPaperId,
  onSelect,
  coverType,
}) => {
  // Filter papers by cover type if specified
  const filteredPapers = coverType
    ? papers.filter((p) => p.coverType === coverType)
    : papers;

  const items: SelectItem[] = filteredPapers.map((paper) => ({
    code: String(paper.id),
    name: paper.name,
    chipColor: paper.color,
    disabled: false,
  }));

  const handleChange = (code: string) => {
    onSelect(parseInt(code, 10));
  };

  const label = coverType === 'cover' ? '표지 용지' : coverType === 'inner' ? '내지 용지' : '용지';

  return (
    <Select
      optionKey={coverType ? `paper-${coverType}` : 'paper'}
      label={label}
      items={items}
      value={selectedPaperId !== null ? String(selectedPaperId) : null}
      onChange={handleChange}
      variant="with-chip"
      placeholder="용지를 선택해주세요"
      required
    />
  );
};

export default PaperSelect;
