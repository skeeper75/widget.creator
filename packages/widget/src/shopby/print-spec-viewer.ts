/**
 * Shopby Print Spec Viewer
 *
 * Formats and displays print specification data from widget option inputs.
 * Provides human-readable output and extraction utilities for design files.
 *
 * @see SPEC-SHOPBY-006 Section: Print Specification Display
 * @MX:SPEC: SPEC-SHOPBY-006
 */

import type { WidgetOptionInputs, WidgetPricePayload } from './types';

// =============================================================================
// SECTION 1: Print Spec Types
// =============================================================================

/**
 * Parsed print specification from widget
 */
export interface ParsedPrintSpec {
  /** Paper type (e.g., '모조지', '아트지') */
  paper?: string;
  /** Paper weight/thickness (e.g., '150g', '200g') */
  paperWeight?: string;
  /** Paper size (e.g., 'A4', 'A3', 'B5') */
  size?: string;
  /** Print color mode (e.g., '단면컬러', '양면컬러') */
  colorMode?: string;
  /** Print quantity */
  quantity?: number;
  /** Binding type (e.g., '무선철', '중철') */
  binding?: string;
  /** Coating type (e.g., '유광코팅', '무광코팅') */
  coating?: string;
  /** Lamination type */
  lamination?: string;
  /** Special processing options */
  specialProcessing?: string[];
  /** Additional options as key-value pairs */
  additionalOptions?: Record<string, string | number>;
  /** Raw JSON content (for debugging) */
  raw?: Record<string, unknown>;
}

/**
 * Display item for rendering print specification
 */
export interface DisplayItem {
  /** Display label (Korean) */
  label: string;
  /** Display value */
  value: string | number;
  /** Category for grouping */
  category: 'paper' | 'print' | 'finishing' | 'quantity' | 'other';
  /** Sort order within category */
  order: number;
}

/**
 * Result of print spec formatting
 */
export interface FormattedPrintSpec {
  /** Ordered display items */
  items: DisplayItem[];
  /** Category-grouped items */
  categories: Record<string, DisplayItem[]>;
  /** Summary text (single line) */
  summary: string;
  /** Detailed text (multi-line) */
  detail: string;
}

// =============================================================================
// SECTION 2: Print Spec Viewer Class
// =============================================================================

/**
 * Formats and displays print specification data.
 *
 * @MX:ANCHOR: Print specification display - transforms widget options to human-readable format
 * @MX:REASON: Used by order confirmation, production tickets, and customer notifications
 */
export class PrintSpecViewer {
  private labelMappings: Map<string, string>;
  private categoryMappings: Map<string, DisplayItem['category']>;

  constructor() {
    this.labelMappings = this.initLabelMappings();
    this.categoryMappings = this.initCategoryMappings();
  }

  /**
   * Format option inputs into a readable specification display.
   *
   * @param optionInputs - Widget option inputs containing printSpec JSON
   */
  formatPrintSpec(optionInputs: WidgetOptionInputs): FormattedPrintSpec {
    const parsed = this.parsePrintSpec(optionInputs.printSpec);
    const items = this.buildDisplayItems(parsed);
    const categories = this.groupByCategory(items);

    return {
      items,
      categories,
      summary: this.buildSummary(items),
      detail: this.buildDetail(items),
    };
  }

  /**
   * Get a list of display items for rendering.
   *
   * @param optionInputs - Widget option inputs
   */
  getDisplayItems(optionInputs: WidgetOptionInputs): DisplayItem[] {
    const parsed = this.parsePrintSpec(optionInputs.printSpec);
    return this.buildDisplayItems(parsed);
  }

  /**
   * Extract design file URL from option inputs.
   *
   * @param optionInputs - Widget option inputs
   */
  extractDesignFileUrl(optionInputs: WidgetOptionInputs): string {
    return optionInputs.designFileUrl;
  }

  /**
   * Parse the printSpec JSON string into a structured object.
   *
   * @MX:NOTE: Handles malformed JSON gracefully with fallback to empty object
   */
  parsePrintSpec(printSpecJson: string): ParsedPrintSpec {
    if (!printSpecJson) {
      return {};
    }

    try {
      const raw = JSON.parse(printSpecJson) as Record<string, unknown>;
      return {
        paper: this.extractString(raw, ['paper', 'paperType', '용지']),
        paperWeight: this.extractString(raw, ['paperWeight', 'paper_weight', '지종']),
        size: this.extractString(raw, ['size', 'paperSize', 'sizeName', '규격']),
        colorMode: this.extractString(raw, ['colorMode', 'color', 'printType', '인쇄방식']),
        quantity: this.extractNumber(raw, ['quantity', 'qty', '수량']),
        binding: this.extractString(raw, ['binding', 'bindingType', '제본']),
        coating: this.extractString(raw, ['coating', 'coatingType', '코팅']),
        lamination: this.extractString(raw, ['lamination', 'laminationType']),
        specialProcessing: this.extractArray(raw, [
          'specialProcessing',
          'specialOptions',
          '후가공',
        ]),
        additionalOptions: this.extractAdditionalOptions(raw),
        raw,
      };
    } catch {
      console.warn('Failed to parse printSpec JSON');
      return {};
    }
  }

  /**
   * Build display items from parsed print spec.
   */
  private buildDisplayItems(parsed: ParsedPrintSpec): DisplayItem[] {
    const items: DisplayItem[] = [];

    // Paper specifications
    if (parsed.paper) {
      items.push({
        label: '용지',
        value: this.formatPaperValue(parsed),
        category: 'paper',
        order: 1,
      });
    }

    // Size
    if (parsed.size) {
      items.push({
        label: '규격',
        value: parsed.size,
        category: 'paper',
        order: 2,
      });
    }

    // Print specifications
    if (parsed.colorMode) {
      items.push({
        label: '인쇄방식',
        value: parsed.colorMode,
        category: 'print',
        order: 1,
      });
    }

    // Quantity
    if (parsed.quantity) {
      items.push({
        label: '수량',
        value: `${parsed.quantity}부`,
        category: 'quantity',
        order: 1,
      });
    }

    // Finishing options
    if (parsed.binding) {
      items.push({
        label: '제본',
        value: parsed.binding,
        category: 'finishing',
        order: 1,
      });
    }

    if (parsed.coating) {
      items.push({
        label: '코팅',
        value: parsed.coating,
        category: 'finishing',
        order: 2,
      });
    }

    if (parsed.lamination) {
      items.push({
        label: '라미네이션',
        value: parsed.lamination,
        category: 'finishing',
        order: 3,
      });
    }

    // Special processing
    if (parsed.specialProcessing && parsed.specialProcessing.length > 0) {
      items.push({
        label: '후가공',
        value: parsed.specialProcessing.join(', '),
        category: 'finishing',
        order: 4,
      });
    }

    // Additional options
    if (parsed.additionalOptions) {
      let order = 1;
      for (const [key, value] of Object.entries(parsed.additionalOptions)) {
        const label = this.labelMappings.get(key) ?? key;
        const category = this.categoryMappings.get(key) ?? 'other';
        items.push({
          label,
          value: typeof value === 'number' ? value.toLocaleString() : value,
          category,
          order: order++,
        });
      }
    }

    // Sort by category and order
    return this.sortItems(items);
  }

  /**
   * Format paper value with weight if available.
   */
  private formatPaperValue(parsed: ParsedPrintSpec): string {
    if (parsed.paperWeight) {
      return `${parsed.paper} (${parsed.paperWeight})`;
    }
    return parsed.paper ?? '';
  }

  /**
   * Group display items by category.
   */
  private groupByCategory(items: DisplayItem[]): Record<string, DisplayItem[]> {
    const categories: Record<string, DisplayItem[]> = {
      paper: [],
      print: [],
      quantity: [],
      finishing: [],
      other: [],
    };

    for (const item of items) {
      const category = item.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    }

    return categories;
  }

  /**
   * Build a single-line summary.
   */
  private buildSummary(items: DisplayItem[]): string {
    const topItems = items.slice(0, 4);
    return topItems.map((item) => `${item.label}: ${item.value}`).join(' | ');
  }

  /**
   * Build a multi-line detailed view.
   */
  private buildDetail(items: DisplayItem[]): string {
    const categories = this.groupByCategory(items);
    const lines: string[] = [];

    const categoryLabels: Record<string, string> = {
      paper: '[용지 정보]',
      print: '[인쇄 정보]',
      quantity: '[수량]',
      finishing: '[후가공]',
      other: '[기타]',
    };

    for (const [category, categoryItems] of Object.entries(categories)) {
      if (categoryItems.length === 0) continue;

      lines.push(categoryLabels[category] ?? `[${category}]`);
      for (const item of categoryItems) {
        lines.push(`  ${item.label}: ${item.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Sort items by category priority and order.
   */
  private sortItems(items: DisplayItem[]): DisplayItem[] {
    const categoryOrder: DisplayItem['category'][] = [
      'paper',
      'print',
      'quantity',
      'finishing',
      'other',
    ];

    return items.sort((a, b) => {
      const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return a.order - b.order;
    });
  }

  /**
   * Extract string value from raw object with multiple key fallbacks.
   */
  private extractString(
    raw: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract number value from raw object with multiple key fallbacks.
   */
  private extractNumber(
    raw: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract array value from raw object with multiple key fallbacks.
   */
  private extractArray(
    raw: Record<string, unknown>,
    keys: string[],
  ): string[] | undefined {
    for (const key of keys) {
      const value = raw[key];
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string');
      }
    }
    return undefined;
  }

  /**
   * Extract additional options not covered by standard fields.
   */
  private extractAdditionalOptions(
    raw: Record<string, unknown>,
  ): Record<string, string | number> | undefined {
    const knownKeys = new Set([
      'paper',
      'paperType',
      '용지',
      'paperWeight',
      'paper_weight',
      '지종',
      'size',
      'paperSize',
      'sizeName',
      '규격',
      'colorMode',
      'color',
      'printType',
      '인쇄방식',
      'quantity',
      'qty',
      '수량',
      'binding',
      'bindingType',
      '제본',
      'coating',
      'coatingType',
      '코팅',
      'lamination',
      'laminationType',
      'specialProcessing',
      'specialOptions',
      '후가공',
    ]);

    const additional: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (knownKeys.has(key)) continue;
      if (typeof value === 'string' || typeof value === 'number') {
        additional[key] = value;
      }
    }

    return Object.keys(additional).length > 0 ? additional : undefined;
  }

  /**
   * Initialize label mappings for common keys.
   */
  private initLabelMappings(): Map<string, string> {
    return new Map([
      ['coverPaper', '표지용지'],
      ['innerPaper', '내지용지'],
      ['coverPrint', '표지인쇄'],
      ['innerPrint', '내지인쇄'],
      ['coverCoating', '표지코팅'],
      ['coverLamination', '표지라미네이션'],
      ['spotUV', '국소코팅'],
      ['foilStamping', '박'],
      ['embossing', '엠보싱'],
      ['dieCut', '재단'],
      ['foldType', '접지'],
      ['pageCount', '페이지'],
      ['coverPageCount', '표지페이지'],
    ]);
  }

  /**
   * Initialize category mappings for common keys.
   */
  private initCategoryMappings(): Map<string, DisplayItem['category']> {
    return new Map([
      ['coverPaper', 'paper'],
      ['innerPaper', 'paper'],
      ['coverPrint', 'print'],
      ['innerPrint', 'print'],
      ['coverCoating', 'finishing'],
      ['coverLamination', 'finishing'],
      ['spotUV', 'finishing'],
      ['foilStamping', 'finishing'],
      ['embossing', 'finishing'],
      ['dieCut', 'finishing'],
      ['foldType', 'finishing'],
      ['pageCount', 'quantity'],
      ['coverPageCount', 'quantity'],
    ]);
  }
}

// =============================================================================
// SECTION 3: Helper Functions
// =============================================================================

/**
 * Create a formatted summary string from widget price payload.
 */
export function formatPriceSummary(price: WidgetPricePayload): string {
  const parts: string[] = [];

  if (price.basePrice > 0) {
    parts.push(`기본가: ${price.basePrice.toLocaleString()}원`);
  }
  if (price.optionPrice > 0) {
    parts.push(`옵션: ${price.optionPrice.toLocaleString()}원`);
  }
  if (price.postProcessPrice > 0) {
    parts.push(`후가공: ${price.postProcessPrice.toLocaleString()}원`);
  }
  if (price.deliveryPrice > 0) {
    parts.push(`배송비: ${price.deliveryPrice.toLocaleString()}원`);
  }

  parts.push(`총액: ${price.totalPrice.toLocaleString()}원`);

  return parts.join(' | ');
}

/**
 * Create a combined display summary from option inputs.
 */
export function createOrderSummary(
  optionInputs: WidgetOptionInputs,
  price?: WidgetPricePayload,
): string {
  const viewer = new PrintSpecViewer();
  const formatted = viewer.formatPrintSpec(optionInputs);

  let summary = formatted.summary;

  if (price) {
    summary += `\n${formatPriceSummary(price)}`;
  }

  return summary;
}

// =============================================================================
// SECTION 4: Singleton Instance
// =============================================================================

let defaultInstance: PrintSpecViewer | null = null;

/**
 * Get the default PrintSpecViewer instance.
 */
export function getPrintSpecViewer(): PrintSpecViewer {
  if (!defaultInstance) {
    defaultInstance = new PrintSpecViewer();
  }
  return defaultInstance;
}

/**
 * Reset the default instance.
 */
export function resetPrintSpecViewer(): void {
  defaultInstance = null;
}
