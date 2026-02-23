/**
 * Mock Factories - Test data factories for all types
 * These factories create consistent test data matching the type definitions
 */

import type {
  WidgetConfig,
  WidgetState,
  DesignTokens,
  DEFAULT_DESIGN_TOKENS,
  OptionChoice,
  OptionDefinition,
  ConstraintRule,
  DependencyRule,
  ConstraintViolation,
  PostProcessGroup,
  PriceBreakdownItem,
  PriceTier,
  PriceState,
  QuotePayload,
  QuoteResponse,
  PriceTableData,
  FixedPriceData,
  ScreenType,
  ScreenConfig,
  ProductSize,
  PaperOption,
} from '@/types';

// ============================================
// Widget Mocks
// ============================================

export function createMockWidgetConfig(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    widgetId: 'wgt_test123',
    productId: 1,
    themePrimary: '#5538B6',
    themeRadius: '4px',
    locale: 'ko',
    ...overrides,
  };
}

export function createMockWidgetState(overrides: Partial<WidgetState> = {}): WidgetState {
  return {
    productId: 1,
    screenType: 'PRINT_OPTION',
    status: 'ready',
    ...overrides,
  };
}

// ============================================
// Option Mocks
// ============================================

export function createMockOptionChoice(overrides: Partial<OptionChoice> = {}): OptionChoice {
  return {
    id: 1,
    optionKey: 'print_type',
    code: 'single',
    name: '단면 인쇄',
    sortOrder: 1,
    disabled: false,
    ...overrides,
  };
}

export function createMockOptionChoices(count = 3): OptionChoice[] {
  return Array.from({ length: count }, (_, i) =>
    createMockOptionChoice({
      id: i + 1,
      code: `option_${i + 1}`,
      name: `옵션 ${i + 1}`,
      sortOrder: i + 1,
    })
  );
}

export function createMockOptionDefinition(
  overrides: Partial<OptionDefinition> = {}
): OptionDefinition {
  return {
    id: 1,
    key: 'print_type',
    label: '인쇄 방식',
    uiComponent: 'toggle-group',
    optionClass: 'primary',
    required: true,
    choices: createMockOptionChoices(),
    ...overrides,
  };
}

export function createMockConstraintRule(overrides: Partial<ConstraintRule> = {}): ConstraintRule {
  return {
    id: 1,
    constraintType: 'visibility',
    sourceOptionId: 1,
    sourceField: 'value',
    operator: 'eq',
    value: 'double',
    targetOptionId: 2,
    targetField: 'visible',
    targetAction: 'show',
    priority: 1,
    ...overrides,
  };
}

export function createMockDependencyRule(overrides: Partial<DependencyRule> = {}): DependencyRule {
  return {
    id: 1,
    parentOptionId: 1,
    parentChoiceId: null,
    childOptionId: 2,
    dependencyType: 'visibility',
    ...overrides,
  };
}

export function createMockConstraintViolation(
  overrides: Partial<ConstraintViolation> = {}
): ConstraintViolation {
  return {
    optionKey: 'quantity',
    message: '수량은 최소 100개 이상이어야 합니다.',
    ruleId: 1,
    currentValue: 50,
    expectedConstraint: 'min:100',
    ...overrides,
  };
}

export function createMockPostProcessGroup(
  overrides: Partial<PostProcessGroup> = {}
): PostProcessGroup {
  return {
    key: 'foil',
    label: '박',
    options: createMockOptionChoices(),
    selectedCode: null,
    ...overrides,
  };
}

// ============================================
// Price Mocks
// ============================================

export function createMockPriceBreakdownItem(
  overrides: Partial<PriceBreakdownItem> = {}
): PriceBreakdownItem {
  return {
    label: '기본 요금',
    amount: 10000,
    ...overrides,
  };
}

export function createMockPriceBreakdown(count = 3): PriceBreakdownItem[] {
  return [
    { label: '기본 요금', amount: 50000 },
    { label: '용지 추가', amount: 10000 },
    { label: '후가공', amount: 5000 },
  ].slice(0, count);
}

export function createMockPriceTier(overrides: Partial<PriceTier> = {}): PriceTier {
  return {
    minQty: 100,
    maxQty: 499,
    unitPrice: 100,
    label: '100~499장',
    ...overrides,
  };
}

export function createMockPriceTiers(): PriceTier[] {
  return [
    { minQty: 100, maxQty: 499, unitPrice: 100, label: '100~499장' },
    { minQty: 500, maxQty: 999, unitPrice: 80, label: '500~999장' },
    { minQty: 1000, maxQty: null, unitPrice: 60, label: '1000장 이상' },
  ];
}

export function createMockPriceState(overrides: Partial<PriceState> = {}): PriceState {
  const subtotal = 65000;
  const vatAmount = 6500;
  return {
    breakdown: createMockPriceBreakdown(),
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    isCalculating: false,
    ...overrides,
  };
}

export function createMockQuotePayload(overrides: Partial<QuotePayload> = {}): QuotePayload {
  return {
    productId: 1,
    sizeId: 1,
    paperId: 1,
    paperCoverId: null,
    quantity: 100,
    customWidth: null,
    customHeight: null,
    options: {},
    postProcesses: {},
    ...overrides,
  };
}

export function createMockQuoteResponse(overrides: Partial<QuoteResponse> = {}): QuoteResponse {
  return {
    quoteId: 'quote_123',
    price: createMockPriceState(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export function createMockPriceTableData(
  overrides: Partial<PriceTableData> = {}
): PriceTableData {
  return {
    id: 1,
    sizeId: 1,
    paperId: null,
    tiers: createMockPriceTiers(),
    ...overrides,
  };
}

export function createMockFixedPriceData(
  overrides: Partial<FixedPriceData> = {}
): FixedPriceData {
  return {
    optionKey: 'coating',
    choiceCode: 'gloss',
    amount: 5000,
    ...overrides,
  };
}

// ============================================
// Screen Mocks
// ============================================

export function createMockProductSize(overrides: Partial<ProductSize> = {}): ProductSize {
  return {
    id: 1,
    name: 'A4',
    width: 210,
    height: 297,
    isCustom: false,
    ...overrides,
  };
}

export function createMockProductSizes(): ProductSize[] {
  return [
    { id: 1, name: 'A4', width: 210, height: 297, isCustom: false },
    { id: 2, name: 'A3', width: 297, height: 420, isCustom: false },
    { id: 3, name: 'B5', width: 176, height: 250, isCustom: false },
    { id: 99, name: '직접입력', width: 0, height: 0, isCustom: true, customMinW: 100, customMaxW: 500, customMinH: 100, customMaxH: 700 },
  ];
}

export function createMockPaperOption(overrides: Partial<PaperOption> = {}): PaperOption {
  return {
    id: 1,
    name: '모조지 80g',
    description: '일반 인쇄용지',
    color: '#FFFFFF',
    coverType: null,
    weight: 80,
    ...overrides,
  };
}

export function createMockPaperOptions(): PaperOption[] {
  return [
    { id: 1, name: '모조지 80g', color: '#FFFFFF', coverType: null, weight: 80 },
    { id: 2, name: '모조지 100g', color: '#FFFFFF', coverType: null, weight: 100 },
    { id: 3, name: '스노우지 120g', color: '#F5F5F5', coverType: null, weight: 120 },
  ];
}

export const SCREEN_CONFIGS: Record<ScreenType, ScreenConfig> = {
  PRINT_OPTION: {
    type: 'PRINT_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'PaperSelect' },
      { type: 'ToggleGroup', props: { optionKey: 'print_type' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'FinishSection' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'full' } },
    ],
    uploadVariant: 'full',
  },
  STICKER_OPTION: {
    type: 'STICKER_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'PaperSelect' },
      { type: 'ToggleGroup', props: { optionKey: 'print_type' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'FinishSection' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'full' } },
    ],
    uploadVariant: 'full',
  },
  BOOK_OPTION: {
    type: 'BOOK_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'ToggleGroup', props: { optionKey: 'binding' } },
      { type: 'ImageChipGroup', props: { optionKey: 'ring' } },
      { type: 'PaperSelect', props: { coverType: 'inner' } },
      { type: 'PaperSelect', props: { coverType: 'cover' } },
      { type: 'FinishSection' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'full' } },
    ],
    uploadVariant: 'full',
  },
  PHOTOBOOK_OPTION: {
    type: 'PHOTOBOOK_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'ToggleGroup', props: { optionKey: 'cover' } },
      { type: 'NumberInput', props: { optionKey: 'pages' } },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'editor-only' } },
    ],
    uploadVariant: 'editor-only',
  },
  CALENDAR_OPTION: {
    type: 'CALENDAR_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'PaperSelect' },
      { type: 'ColorChipGroup', props: { optionKey: 'stand' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'upload-only' } },
    ],
    uploadVariant: 'upload-only',
  },
  DESIGN_CALENDAR_OPTION: {
    type: 'DESIGN_CALENDAR_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'PaperSelect' },
      { type: 'Select', props: { optionKey: 'laser' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'editor-only' } },
    ],
    uploadVariant: 'editor-only',
  },
  SIGN_OPTION: {
    type: 'SIGN_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'DualInput' },
      { type: 'PaperSelect' },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'upload-only' } },
    ],
    uploadVariant: 'upload-only',
  },
  ACRYLIC_OPTION: {
    type: 'ACRYLIC_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'DualInput' },
      { type: 'ToggleGroup', props: { optionKey: 'material' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'QuantitySlider' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'editor-only' } },
    ],
    uploadVariant: 'editor-only',
  },
  GOODS_OPTION: {
    type: 'GOODS_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'ColorChipGroup' },
      { type: 'ToggleGroup', props: { optionKey: 'processing' } },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'QuantitySlider' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'full' } },
    ],
    uploadVariant: 'full',
  },
  STATIONERY_OPTION: {
    type: 'STATIONERY_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'ToggleGroup', props: { optionKey: 'inner' } },
      { type: 'PaperSelect' },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'QuantitySlider' },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'full' } },
    ],
    uploadVariant: 'full',
  },
  ACCESSORY_OPTION: {
    type: 'ACCESSORY_OPTION',
    components: [
      { type: 'SizeSelector' },
      { type: 'NumberInput', props: { optionKey: 'quantity' } },
      { type: 'PriceSummary' },
      { type: 'UploadActions', props: { variant: 'cart-only' } },
    ],
    uploadVariant: 'cart-only',
  },
};
