/**
 * MES v5 JSON parser
 * Extracts option definitions, choices, product options, and editor mappings
 * @MX:NOTE: [AUTO] Pure functional parser with no DB dependencies
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */

// ============================================================
// Type definitions matching MES v5 JSON structure
// ============================================================

export interface MesCategory {
  categoryCode: string;
  categoryName: string;
  slug: string;
  subCategories: string;
  productCount: number;
}

export interface MesProduct {
  categoryCode: string;
  categoryName: string;
  subCategory: string | null;
  shopbyId: number | null;
  MesItemCd: string;
  MesItemName: string;
  productName: string;
  productType: string;
  figmaSection: string | null;
  editor: string | null;
  materialOptions: string;
  processOptions: string;
  settingOptions: string;
}

export interface MesOption {
  categoryCode: string;
  categoryName: string;
  subCategory: string | null;
  MesItemCd: string;
  MesItemName: string;
  productName: string;
  optionKey: string;
  optionLabel: string;
  optionClass: string;
  optionType: string;
  uiComponent: string;
  required: string;
  choiceCount: number;
  choiceList: string;
}

export interface MesChoice {
  categoryCode: string;
  categoryName: string;
  subCategory: string | null;
  MesItemCd: string;
  MesItemName: string;
  productName: string;
  optionKey: string;
  optionLabel: string;
  optionClass: string;
  uiComponent: string;
  choiceLabel: string;
  choiceValue: string;
  priceKey: string | null;
  code: string | null;
}

export interface MesSummary {
  categories: number;
  products: number;
  options: number;
  choices: number;
  optionKeys: number;
  priceKeyFilled: number;
  codeFilled: number;
}

export interface MesJsonData {
  categories: MesCategory[];
  products: MesProduct[];
  options: MesOption[];
  choices: MesChoice[];
  summary: MesSummary;
}

// ============================================================
// Output record types (ready for DB insertion)
// ============================================================

export interface OptionDefinitionRecord {
  key: string;
  name: string;
  optionClass: string;
  optionType: string;
  uiComponent: string;
  description: string | null;
  displayOrder: number;
}

export interface OptionChoiceRecord {
  optionKey: string;
  code: string;
  name: string;
  choiceValue: string;
  priceKey: string | null;
  displayOrder: number;
}

export interface ProductOptionRecord {
  mesItemCd: string;
  optionKey: string;
  isRequired: boolean;
  displayOrder: number;
  optionClass: string;
}

export interface EditorMappingRecord {
  shopbyId: number;
  editorType: string;
}

// ============================================================
// Mapping tables
// ============================================================

// @MX:NOTE: [AUTO] Korean optionClass to English mapping: 자재->material, 공정->process, 설정->setting
// @MX:SPEC: SPEC-DATA-003
const OPTION_CLASS_MAP: Record<string, string> = {
  '\uc790\uc7ac': 'material',  // material
  '\uacf5\uc815': 'process',   // process
  '\uc124\uc815': 'setting',   // setting
};

// @MX:NOTE: [AUTO] Maps MES UI component names to widget-creator component identifiers
// @MX:SPEC: SPEC-DATA-003
const UI_COMPONENT_MAP: Record<string, string> = {
  'button-group': 'toggle-group',
  'select-box': 'select',
  'finish-title-bar': 'collapsible',
  'count-input': 'input:number',
  'finish-button': 'toggle-group',
  'toggle-group': 'toggle-group',
  'image-chip': 'radio-group:image-chip',
  'color-chip': 'radio-group:color-chip',
};

// @MX:ANCHOR: [AUTO] Maps raw optionClass to DB-friendly English value
// @MX:REASON: Used by extractOptionDefinitions, extractProductOptions, and importers
export function mapOptionClass(raw: string): string {
  return OPTION_CLASS_MAP[raw] || raw;
}

export function mapUiComponent(raw: string): string {
  return UI_COMPONENT_MAP[raw] || raw;
}

// ============================================================
// Parser functions
// ============================================================

// @MX:ANCHOR: [AUTO] Validates and returns parsed MES JSON structure
// @MX:REASON: fan_in >= 3 (orchestrator entry point, all downstream extractors depend on validated data)
export function parseMesJson(data: MesJsonData): MesJsonData {
  if (!data.products || !data.options || !data.choices) {
    throw new Error('Invalid MES JSON: missing required fields (products, options, choices)');
  }
  return data;
}

// @MX:ANCHOR: [AUTO] Extracts 30 unique option definitions from MES options array
// @MX:REASON: fan_in >= 3 (orchestrator, option-definitions importer, tests)
export function extractOptionDefinitions(options: MesOption[]): OptionDefinitionRecord[] {
  const seen = new Map<string, OptionDefinitionRecord>();
  // Track per-class counters for displayOrder
  const classCounters: Record<string, number> = {
    material: 0,
    process: 9,   // material 1-9, process 10-23
    setting: 23,  // setting 24-30
  };

  for (const opt of options) {
    if (seen.has(opt.optionKey)) continue;

    const optionClass = mapOptionClass(opt.optionClass);
    classCounters[optionClass] = (classCounters[optionClass] || 0) + 1;
    const displayOrder = classCounters[optionClass];

    seen.set(opt.optionKey, {
      key: opt.optionKey,
      name: opt.optionLabel,
      optionClass,
      optionType: optionClass, // Use optionClass value as optionType
      uiComponent: mapUiComponent(opt.uiComponent),
      description: null,
      displayOrder,
    });
  }

  return Array.from(seen.values());
}

// @MX:NOTE: [AUTO] Deduplicates choices on composite key (optionKey|choiceValue) to prevent duplicates
// @MX:SPEC: SPEC-DATA-003
export function extractOptionChoices(choices: MesChoice[]): OptionChoiceRecord[] {
  const seen = new Map<string, OptionChoiceRecord>();
  const keyCounters = new Map<string, number>();

  for (const choice of choices) {
    const dedupeKey = `${choice.optionKey}|${choice.choiceValue}`;
    if (seen.has(dedupeKey)) continue;

    const count = (keyCounters.get(choice.optionKey) || 0) + 1;
    keyCounters.set(choice.optionKey, count);

    seen.set(dedupeKey, {
      optionKey: choice.optionKey,
      code: choice.code || choice.choiceValue,
      name: choice.choiceLabel,
      choiceValue: choice.choiceValue,
      priceKey: choice.priceKey || null,
      displayOrder: count - 1,
    });
  }

  return Array.from(seen.values());
}

export function extractProductOptions(options: MesOption[]): ProductOptionRecord[] {
  // Track per-product class counters for displayOrder
  const productClassCounters = new Map<string, Record<string, number>>();

  return options.map(opt => {
    const optionClass = mapOptionClass(opt.optionClass);

    if (!productClassCounters.has(opt.MesItemCd)) {
      productClassCounters.set(opt.MesItemCd, { material: 0, process: 9, setting: 23 });
    }
    const counters = productClassCounters.get(opt.MesItemCd)!;
    counters[optionClass] = (counters[optionClass] || 0) + 1;

    return {
      mesItemCd: opt.MesItemCd,
      optionKey: opt.optionKey,
      isRequired: opt.required === 'Y',
      displayOrder: counters[optionClass],
      optionClass,
    };
  });
}

export function extractEditorMappings(products: MesProduct[]): EditorMappingRecord[] {
  return products
    .filter(p => p.editor === 'O' && p.shopbyId !== null)
    .map(p => ({
      shopbyId: p.shopbyId!,
      editorType: 'edicus',
    }));
}
