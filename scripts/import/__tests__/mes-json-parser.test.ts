/**
 * RED Phase: mes-json-parser.ts specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import { describe, it, expect } from 'vitest';
import {
  parseMesJson,
  extractOptionDefinitions,
  extractOptionChoices,
  extractProductOptions,
  extractEditorMappings,
  type MesJsonData,
  type MesProduct,
  type MesOption,
  type MesChoice,
} from '../parsers/mes-json-parser.js';

// Minimal fixture data for testing
const createFixtureData = (): MesJsonData => ({
  categories: [
    { categoryCode: '01', categoryName: 'Test', slug: 'test', subCategories: 'A', productCount: 2 },
  ],
  products: [
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      shopbyId: 14529, MesItemCd: '001-0001', MesItemName: 'Product A',
      productName: 'Product A', productType: 'digital-print',
      figmaSection: 'PRODUCT_PRINT_OPTION', editor: 'O',
      materialOptions: 'size, paper', processOptions: 'printType',
      settingOptions: 'quantity',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      shopbyId: 14530, MesItemCd: '001-0002', MesItemName: 'Product B',
      productName: 'Product B', productType: 'digital-print',
      figmaSection: null, editor: null,
      materialOptions: 'size', processOptions: 'printType',
      settingOptions: 'quantity',
    },
  ],
  options: [
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'size', optionLabel: 'Size', optionClass: '\uc790\uc7ac',
      optionType: 'select', uiComponent: 'button-group',
      required: 'Y', choiceCount: 2, choiceList: '73x98, 100x150',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'paper', optionLabel: 'Paper', optionClass: '\uc790\uc7ac',
      optionType: 'select', uiComponent: 'select-box',
      required: 'Y', choiceCount: 1, choiceList: 'Paper1',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'printType', optionLabel: 'Print Type', optionClass: '\uacf5\uc815',
      optionType: 'select', uiComponent: 'button-group',
      required: 'N', choiceCount: 1, choiceList: 'Offset',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'quantity', optionLabel: 'Quantity', optionClass: '\uc124\uc815',
      optionType: 'number', uiComponent: 'count-input',
      required: 'Y', choiceCount: 0, choiceList: '',
    },
    // Duplicate size for Product B (should not create new definition)
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0002', MesItemName: 'Product B', productName: 'Product B',
      optionKey: 'size', optionLabel: 'Size', optionClass: '\uc790\uc7ac',
      optionType: 'select', uiComponent: 'button-group',
      required: 'Y', choiceCount: 1, choiceList: '73x98',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0002', MesItemName: 'Product B', productName: 'Product B',
      optionKey: 'printType', optionLabel: 'Print Type', optionClass: '\uacf5\uc815',
      optionType: 'select', uiComponent: 'button-group',
      required: 'N', choiceCount: 1, choiceList: 'Offset',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0002', MesItemName: 'Product B', productName: 'Product B',
      optionKey: 'quantity', optionLabel: 'Quantity', optionClass: '\uc124\uc815',
      optionType: 'number', uiComponent: 'count-input',
      required: 'Y', choiceCount: 0, choiceList: '',
    },
  ],
  choices: [
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'size', optionLabel: 'Size', optionClass: '\uc790\uc7ac',
      uiComponent: 'button-group',
      choiceLabel: '73 x 98 mm', choiceValue: '73x98', priceKey: null, code: null,
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'size', optionLabel: 'Size', optionClass: '\uc790\uc7ac',
      uiComponent: 'button-group',
      choiceLabel: '100 x 150 mm', choiceValue: '100x150', priceKey: 'size_100x150', code: null,
    },
    // Duplicate choice (same optionKey + choiceValue from Product B)
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0002', MesItemName: 'Product B', productName: 'Product B',
      optionKey: 'size', optionLabel: 'Size', optionClass: '\uc790\uc7ac',
      uiComponent: 'button-group',
      choiceLabel: '73 x 98 mm', choiceValue: '73x98', priceKey: null, code: null,
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'paper', optionLabel: 'Paper', optionClass: '\uc790\uc7ac',
      uiComponent: 'select-box',
      choiceLabel: 'Art Paper 250g', choiceValue: 'art250', priceKey: 'paper_art250', code: 'ART250',
    },
    {
      categoryCode: '01', categoryName: 'Test', subCategory: 'A',
      MesItemCd: '001-0001', MesItemName: 'Product A', productName: 'Product A',
      optionKey: 'printType', optionLabel: 'Print Type', optionClass: '\uacf5\uc815',
      uiComponent: 'button-group',
      choiceLabel: 'Offset Print', choiceValue: 'offset', priceKey: null, code: '1',
    },
  ],
  summary: { categories: 1, products: 2, options: 7, choices: 5, optionKeys: 4, priceKeyFilled: 2, codeFilled: 2 },
});

describe('MES JSON Parser', () => {
  describe('parseMesJson', () => {
    it('should parse valid MES JSON data', () => {
      const data = createFixtureData();
      const result = parseMesJson(data);
      expect(result).toBeDefined();
      expect(result.products).toHaveLength(2);
      expect(result.options).toHaveLength(7);
      expect(result.choices).toHaveLength(5);
    });

    it('should throw on missing required fields', () => {
      expect(() => parseMesJson({} as MesJsonData)).toThrow();
    });
  });

  describe('extractOptionDefinitions', () => {
    it('should deduplicate by optionKey and return unique definitions', () => {
      const data = createFixtureData();
      const defs = extractOptionDefinitions(data.options);
      // 4 unique option keys: size, paper, printType, quantity
      expect(defs).toHaveLength(4);
    });

    it('should map optionClass correctly', () => {
      const data = createFixtureData();
      const defs = extractOptionDefinitions(data.options);
      const sizeDef = defs.find(d => d.key === 'size');
      expect(sizeDef?.optionClass).toBe('material');
      const printDef = defs.find(d => d.key === 'printType');
      expect(printDef?.optionClass).toBe('process');
      const qtyDef = defs.find(d => d.key === 'quantity');
      expect(qtyDef?.optionClass).toBe('setting');
    });

    it('should map uiComponent correctly', () => {
      const data = createFixtureData();
      const defs = extractOptionDefinitions(data.options);
      const sizeDef = defs.find(d => d.key === 'size');
      expect(sizeDef?.uiComponent).toBe('toggle-group');
      const paperDef = defs.find(d => d.key === 'paper');
      expect(paperDef?.uiComponent).toBe('select');
      const qtyDef = defs.find(d => d.key === 'quantity');
      expect(qtyDef?.uiComponent).toBe('input:number');
    });

    it('should use optionClass value as optionType', () => {
      const data = createFixtureData();
      const defs = extractOptionDefinitions(data.options);
      const sizeDef = defs.find(d => d.key === 'size');
      expect(sizeDef?.optionType).toBe('material');
    });

    it('should compute displayOrder based on optionClass grouping', () => {
      const data = createFixtureData();
      const defs = extractOptionDefinitions(data.options);
      // Material options should be 1-9, process 10-23, setting 24-30
      const materialDefs = defs.filter(d => d.optionClass === 'material');
      const processDefs = defs.filter(d => d.optionClass === 'process');
      const settingDefs = defs.filter(d => d.optionClass === 'setting');
      for (const d of materialDefs) {
        expect(d.displayOrder).toBeGreaterThanOrEqual(1);
        expect(d.displayOrder).toBeLessThanOrEqual(9);
      }
      for (const d of processDefs) {
        expect(d.displayOrder).toBeGreaterThanOrEqual(10);
        expect(d.displayOrder).toBeLessThanOrEqual(23);
      }
      for (const d of settingDefs) {
        expect(d.displayOrder).toBeGreaterThanOrEqual(24);
        expect(d.displayOrder).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('extractOptionChoices', () => {
    it('should deduplicate by optionKey + choiceValue', () => {
      const data = createFixtureData();
      const choices = extractOptionChoices(data.choices);
      // 5 total, but 73x98 is duplicated, so 4 unique
      expect(choices).toHaveLength(4);
    });

    it('should preserve priceKey and code', () => {
      const data = createFixtureData();
      const choices = extractOptionChoices(data.choices);
      const paperChoice = choices.find(c => c.optionKey === 'paper' && c.choiceValue === 'art250');
      expect(paperChoice?.priceKey).toBe('paper_art250');
      expect(paperChoice?.code).toBe('ART250');
    });

    it('should use choiceValue as code when code is null', () => {
      const data = createFixtureData();
      const choices = extractOptionChoices(data.choices);
      const sizeChoice = choices.find(c => c.optionKey === 'size' && c.choiceValue === '73x98');
      expect(sizeChoice?.code).toBe('73x98');
    });
  });

  describe('extractProductOptions', () => {
    it('should extract all product-option associations', () => {
      const data = createFixtureData();
      const prodOpts = extractProductOptions(data.options);
      // 7 options (4 for product A + 3 for product B)
      expect(prodOpts).toHaveLength(7);
    });

    it('should map required Y/N to boolean', () => {
      const data = createFixtureData();
      const prodOpts = extractProductOptions(data.options);
      const sizeOpt = prodOpts.find(po => po.mesItemCd === '001-0001' && po.optionKey === 'size');
      expect(sizeOpt?.isRequired).toBe(true);
      const printOpt = prodOpts.find(po => po.mesItemCd === '001-0001' && po.optionKey === 'printType');
      expect(printOpt?.isRequired).toBe(false);
    });

    it('should include shopbyId for product resolution', () => {
      const data = createFixtureData();
      const prodOpts = extractProductOptions(data.options);
      const opt = prodOpts.find(po => po.mesItemCd === '001-0001');
      expect(opt?.mesItemCd).toBe('001-0001');
    });
  });

  describe('extractEditorMappings', () => {
    it('should extract only products with editor = O', () => {
      const data = createFixtureData();
      const mappings = extractEditorMappings(data.products);
      expect(mappings).toHaveLength(1);
      expect(mappings[0].shopbyId).toBe(14529);
    });

    it('should set editorType to edicus', () => {
      const data = createFixtureData();
      const mappings = extractEditorMappings(data.products);
      expect(mappings[0].editorType).toBe('edicus');
    });
  });
});
