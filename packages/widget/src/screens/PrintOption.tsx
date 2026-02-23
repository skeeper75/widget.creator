/**
 * PrintOption Screen Configuration
 * Standard print product options
 * @see SPEC-WIDGET-SDK-001 Section 4.5 Screen 01
 */

import { h, FunctionalComponent } from 'preact';
import {
  SizeSelector,
  PaperSelect,
  NumberInput,
  FinishSection,
  PriceSummary,
  UploadActions,
} from '../components';
import { ToggleGroup } from '../primitives';
import type { ScreenConfig, ProductSize, PaperOption, PostProcessGroup } from '../types';

/**
 * PrintOption Screen Props
 */
export interface PrintOptionProps {
  sizes: ProductSize[];
  papers: PaperOption[];
  selectedSizeId: number | null;
  selectedPaperId: number | null;
  printType: string | null;
  quantity: number;
  postProcessGroups: PostProcessGroup[];
  envelopeType: string | null;
  priceBreakdown: { label: string; amount: number }[];
  priceTotal: number;
  priceVat: number;
  isCalculating: boolean;
  isComplete: boolean;
  onSizeSelect: (id: number) => void;
  onPaperSelect: (id: number) => void;
  onPrintTypeChange: (code: string) => void;
  onQuantityChange: (qty: number) => void;
  onPostProcessChange: (groupKey: string, code: string) => void;
  onEnvelopeChange: (code: string) => void;
  onUpload: () => void;
  onEditor: () => void;
  onAddToCart: () => void;
  onOrder: () => void;
}

/**
 * Screen 01: PRINT_OPTION
 * SizeSelector -> PaperSelect -> ToggleGroup (인쇄, 별색x5, 코팅) -> NumberInput (수량)
 * -> FinishSection {박, 형압, 오시, 미싱, 가변, 귀돌이} -> Select (봉투)
 * -> PriceSummary -> UploadActions (full)
 */
export const PrintOption: FunctionalComponent<PrintOptionProps> = ({
  sizes,
  papers,
  selectedSizeId,
  selectedPaperId,
  printType,
  quantity,
  postProcessGroups,
  envelopeType,
  priceBreakdown,
  priceTotal,
  priceVat,
  isCalculating,
  isComplete,
  onSizeSelect,
  onPaperSelect,
  onPrintTypeChange,
  onQuantityChange,
  onPostProcessChange,
  onEnvelopeChange,
  onUpload,
  onEditor,
  onAddToCart,
  onOrder,
}) => {
  return (
    <div class="screen screen--print-option">
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
          { code: '3', name: '3색' },
          { code: '4', name: '4색' },
          { code: '5', name: '5색' },
        ]}
        value={null}
        onChange={() => {}}
        variant="compact"
      />

      <ToggleGroup
        optionKey="coating"
        label="코팅"
        items={[
          { code: 'none', name: '없음' },
          { code: 'gloss', name: '유광' },
          { code: 'matte', name: '무광' },
        ]}
        value={null}
        onChange={() => {}}
        variant="compact"
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

      <ToggleGroup
        optionKey="envelope"
        label="봉투"
        items={[
          { code: 'none', name: '없음' },
          { code: 'standard', name: '일반봉투' },
          { code: 'window', name: '창봉투' },
        ]}
        value={envelopeType}
        onChange={onEnvelopeChange}
        variant="compact"
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

export const printOptionConfig: ScreenConfig = {
  type: 'PRINT_OPTION',
  components: [
    { type: 'SizeSelector' },
    { type: 'PaperSelect' },
    { type: 'ToggleGroup', props: { optionKey: 'print-type', label: '인쇄 방식' } },
    { type: 'ToggleGroup', props: { optionKey: 'color', label: '별색' } },
    { type: 'ToggleGroup', props: { optionKey: 'coating', label: '코팅' } },
    { type: 'NumberInput', props: { optionKey: 'quantity', label: '수량' } },
    { type: 'FinishSection' },
    { type: 'Select', props: { optionKey: 'envelope', label: '봉투' } },
    { type: 'PriceSummary' },
    { type: 'UploadActions', props: { variant: 'full' } },
  ],
  uploadVariant: 'full',
};

export default PrintOption;
