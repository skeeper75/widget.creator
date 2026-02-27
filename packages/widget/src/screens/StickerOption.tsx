/**
 * StickerOption Screen Configuration
 * Sticker product options
 * @see SPEC-WIDGET-SDK-001 Section 4.5 Screen 02
 */

import { FunctionalComponent } from 'preact';
import {
  SizeSelector,
  PaperSelect,
  NumberInput,
  FinishSection,
  PriceSummary,
  UploadActions,
} from '../components';
import { ToggleGroup, Select } from '../primitives';
import type { ProductSize, PaperOption, PostProcessGroup } from '../types';

export interface StickerOptionProps {
  sizes: ProductSize[];
  papers: PaperOption[];
  selectedSizeId: number | null;
  selectedPaperId: number | null;
  printType: string | null;
  cutType: string | null;
  pieces: string | null;
  quantity: number;
  postProcessGroups: PostProcessGroup[];
  priceBreakdown: { label: string; amount: number }[];
  priceTotal: number;
  priceVat: number;
  isCalculating: boolean;
  isComplete: boolean;
  onSizeSelect: (id: number) => void;
  onPaperSelect: (id: number) => void;
  onPrintTypeChange: (code: string) => void;
  onCutTypeChange: (code: string) => void;
  onPiecesChange: (code: string) => void;
  onQuantityChange: (qty: number) => void;
  onPostProcessChange: (groupKey: string, code: string) => void;
  onUpload: () => void;
  onEditor: () => void;
  onAddToCart: () => void;
  onOrder: () => void;
}

/**
 * Screen 02: STICKER_OPTION
 */
export const StickerOption: FunctionalComponent<StickerOptionProps> = ({
  sizes,
  papers,
  selectedSizeId,
  selectedPaperId,
  printType,
  cutType,
  pieces,
  quantity,
  postProcessGroups,
  priceBreakdown,
  priceTotal,
  priceVat,
  isCalculating,
  isComplete,
  onSizeSelect,
  onPaperSelect,
  onPrintTypeChange,
  onCutTypeChange,
  onPiecesChange,
  onQuantityChange,
  onPostProcessChange,
  onUpload,
  onEditor,
  onAddToCart,
  onOrder,
}) => {
  return (
    <div class="screen screen--sticker-option">
      <SizeSelector
        sizes={sizes}
        selectedSizeId={selectedSizeId}
        onSelect={onSizeSelect}
      />

      <PaperSelect
        papers={papers}
        selectedPaperId={selectedPaperId}
        onSelect={onPaperSelect}
      />

      <ToggleGroup
        optionKey="print-type"
        label="인쇄 방식"
        items={[
          { code: 'offset', name: '인쇄' },
          { code: 'digital', name: '디지털' },
        ]}
        value={printType}
        onChange={onPrintTypeChange}
        variant="default"
        required
      />

      <ToggleGroup
        optionKey="color"
        label="별색"
        items={[
          { code: '0', name: '없음' },
          { code: '1', name: '1색' },
          { code: '2', name: '2색' },
        ]}
        value={null}
        onChange={() => {}}
        variant="compact"
      />

      <ToggleGroup
        optionKey="cutting"
        label="커팅"
        items={[
          { code: 'none', name: '없음' },
          { code: 'kiss', name: '키스컷' },
          { code: 'through', name: '실톤' },
        ]}
        value={cutType}
        onChange={onCutTypeChange}
        variant="compact"
      />

      <Select
        optionKey="pieces"
        label="조각수"
        items={[
          { code: '1', name: '1조각' },
          { code: '2', name: '2조각' },
          { code: '4', name: '4조각' },
          { code: '6', name: '6조각' },
          { code: '8', name: '8조각' },
          { code: '12', name: '12조각' },
        ]}
        value={pieces}
        onChange={onPiecesChange}
        variant="default"
        required
      />

      <NumberInput
        optionKey="quantity"
        label="수량"
        value={quantity}
        onChange={onQuantityChange}
        constraints={{ min: 1, max: 10000, step: 1 }}
        unit="장"
      />

      <FinishSection
        groups={postProcessGroups}
        onOptionChange={onPostProcessChange}
      />

      <PriceSummary
        breakdown={priceBreakdown}
        total={priceTotal}
        vatAmount={priceVat}
        isCalculating={isCalculating}
      />

      <UploadActions
        variant="full"
        onUpload={onUpload}
        onEditor={onEditor}
        onAddToCart={onAddToCart}
        onOrder={onOrder}
        disabled={!isComplete}
      />
    </div>
  );
};

export default StickerOption;
