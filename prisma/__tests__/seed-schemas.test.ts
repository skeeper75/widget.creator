/**
 * SPEC-SEED-002 TEST-006: Zod Schema Validation Tests
 *
 * Tests the Zod schemas defined in scripts/lib/schemas.ts.
 * Validates that:
 *   1. Real data files parse successfully through schemas
 *   2. Invalid data is rejected with descriptive errors
 *   3. loadAndValidate helper handles edge cases
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { ZodError } from 'zod';

import {
  PaperJsonSchema,
  GoodsJsonSchema,
  BindingJsonSchema,
  OptionConstraintsJsonSchema,
  loadAndValidate,
} from '../../scripts/lib/schemas';

// ============================================================
// Data paths
// ============================================================

const DATA_DIR = resolve(__dirname, '..', '..', 'data', '2026-02-23');
const PRICING_DIR = resolve(DATA_DIR, 'pricing');

// ============================================================
// 1. Valid schema tests - Load actual data files
// ============================================================

describe('SPEC-SEED-002 TEST-006: Zod Schema Validation', () => {
  describe('Valid data file parsing', () => {
    it('paper.json parses without errors', () => {
      const paperPath = resolve(PRICING_DIR, 'paper.json');
      expect(existsSync(paperPath)).toBe(true);

      const data = loadAndValidate(PaperJsonSchema, paperPath);
      expect(data.papers).toBeDefined();
      expect(data.papers.length).toBeGreaterThan(0);
    });

    it('paper.json has 83 paper records', () => {
      const paperPath = resolve(PRICING_DIR, 'paper.json');
      const data = loadAndValidate(PaperJsonSchema, paperPath);
      expect(data.papers).toHaveLength(83);
    });

    it('paper.json records with gramWeight have positive integer values', () => {
      const paperPath = resolve(PRICING_DIR, 'paper.json');
      const data = loadAndValidate(PaperJsonSchema, paperPath);
      for (const paper of data.papers) {
        if (paper.gramWeight !== null) {
          expect(paper.gramWeight).toBeGreaterThan(0);
          expect(Number.isInteger(paper.gramWeight)).toBe(true);
        }
      }
      // At least some papers should have gramWeight
      const withGramWeight = data.papers.filter((p) => p.gramWeight !== null);
      expect(withGramWeight.length).toBeGreaterThan(50);
    });

    it('goods.json parses without errors (even with price=0)', () => {
      const goodsPath = resolve(PRICING_DIR, 'products', 'goods.json');
      expect(existsSync(goodsPath)).toBe(true);

      const data = loadAndValidate(GoodsJsonSchema, goodsPath);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('goods.json allows sellingPrice=0', () => {
      const goodsPath = resolve(PRICING_DIR, 'products', 'goods.json');
      const data = loadAndValidate(GoodsJsonSchema, goodsPath);
      // All current goods have sellingPrice=0; schema should allow this
      const zeroPriceItems = data.data.filter(
        (item) => item.sellingPrice === 0,
      );
      expect(zeroPriceItems.length).toBeGreaterThan(0);
    });

    it('option-constraints.json parses without errors', () => {
      const constraintsPath = resolve(
        DATA_DIR,
        'products',
        'option-constraints.json',
      );
      expect(existsSync(constraintsPath)).toBe(true);

      const data = loadAndValidate(
        OptionConstraintsJsonSchema,
        constraintsPath,
      );
      expect(data.constraints).toBeDefined();
      expect(data.constraints.length).toBeGreaterThan(0);
    });

    it('option-constraints.json metadata.total_constraints matches array length', () => {
      const constraintsPath = resolve(
        DATA_DIR,
        'products',
        'option-constraints.json',
      );
      const data = loadAndValidate(
        OptionConstraintsJsonSchema,
        constraintsPath,
      );
      expect(data.constraints.length).toBe(
        data.metadata.total_constraints,
      );
    });

    it('binding.json parses without errors', () => {
      const bindingPath = resolve(PRICING_DIR, 'binding.json');
      expect(existsSync(bindingPath)).toBe(true);

      const data = loadAndValidate(BindingJsonSchema, bindingPath);
      expect(data.bindingTypes).toBeDefined();
      expect(data.bindingTypes.length).toBeGreaterThan(0);
    });

    it('binding.json has 4 binding types', () => {
      const bindingPath = resolve(PRICING_DIR, 'binding.json');
      const data = loadAndValidate(BindingJsonSchema, bindingPath);
      expect(data.bindingTypes).toHaveLength(4);
    });

    it('binding.json types have non-empty priceTiers', () => {
      const bindingPath = resolve(PRICING_DIR, 'binding.json');
      const data = loadAndValidate(BindingJsonSchema, bindingPath);
      for (const bindingType of data.bindingTypes) {
        expect(bindingType.priceTiers.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // 2. Invalid schema tests - Mock invalid data
  // ============================================================

  describe('Invalid data rejection', () => {
    describe('Paper schema', () => {
      it('rejects paper with missing name field', () => {
        const invalidData = {
          papers: [
            {
              abbreviation: '백모조',
              gramWeight: 100,
              fullSheetSize: '국전(939*636)',
              sellingPerReam: 61460,
            },
          ],
        };

        expect(() => PaperJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('rejects paper with string instead of number for gramWeight', () => {
        const invalidData = {
          papers: [
            {
              name: '백색모조지 100g',
              abbreviation: '백모조',
              gramWeight: 'hundred',
              fullSheetSize: '국전(939*636)',
              sellingPerReam: 61460,
            },
          ],
        };

        expect(() => PaperJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('rejects paper with string instead of number for sellingPerReam', () => {
        const invalidData = {
          papers: [
            {
              name: '백색모조지 100g',
              abbreviation: '백모조',
              gramWeight: 100,
              fullSheetSize: '국전(939*636)',
              sellingPerReam: 'expensive',
            },
          ],
        };

        expect(() => PaperJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('rejects papers array with non-object elements', () => {
        const invalidData = {
          papers: ['not-an-object', 42, null],
        };

        expect(() => PaperJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('provides descriptive error message for missing required field', () => {
        const invalidData = { papers: [{ gramWeight: 100 }] };

        try {
          PaperJsonSchema.parse(invalidData);
          expect.fail('Should have thrown');
        } catch (e) {
          expect(e).toBeInstanceOf(ZodError);
          const zodError = e as ZodError;
          expect(zodError.issues.length).toBeGreaterThan(0);
          // Error should mention the missing field path
          const paths = zodError.issues.map((i) => i.path.join('.'));
          expect(paths.some((p) => p.includes('name'))).toBe(true);
        }
      });
    });

    describe('Goods schema', () => {
      it('rejects goods with missing productName field', () => {
        const invalidData = {
          data: [
            {
              category: '아크릴',
              cost: 0,
              sellingPrice: 0,
              sellingPriceVatIncl: 0,
            },
          ],
        };

        expect(() => GoodsJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('rejects goods with string instead of number for sellingPrice', () => {
        const invalidData = {
          data: [
            {
              category: '아크릴',
              productName: '아크릴키링',
              productOption: null,
              selectOption: null,
              cost: 0,
              sellingPrice: 'free',
              sellingPriceVatIncl: 0,
            },
          ],
        };

        expect(() => GoodsJsonSchema.parse(invalidData)).toThrow(ZodError);
      });
    });

    describe('Binding schema', () => {
      it('rejects binding with missing code field', () => {
        const invalidData = {
          bindingTypes: [
            {
              name: '중철제본',
              priceTiers: [{ quantity: 1, unitPrice: 3000 }],
            },
          ],
        };

        expect(() => BindingJsonSchema.parse(invalidData)).toThrow(ZodError);
      });

      it('rejects binding with string instead of number for code', () => {
        const invalidData = {
          bindingTypes: [
            {
              name: '중철제본',
              code: 'not-a-number',
              priceTiers: [{ quantity: 1, unitPrice: 3000 }],
            },
          ],
        };

        expect(() => BindingJsonSchema.parse(invalidData)).toThrow(ZodError);
      });
    });

    describe('Option constraints schema', () => {
      it('rejects constraint with invalid constraint_type', () => {
        const invalidData = {
          metadata: {
            source: '상품마스터',
            generated_at: '2026-02-23',
            total_constraints: 1,
          },
          constraints: [
            {
              product_code: '001-0001',
              sheet_name: '디지털인쇄',
              constraint_type: 'invalid_type',
              rule_text: '★test',
              description: 'test',
              row: 1,
              col: 1,
              product_name: 'test',
            },
          ],
        };

        expect(() =>
          OptionConstraintsJsonSchema.parse(invalidData),
        ).toThrow(ZodError);
      });

      it('rejects constraint with missing product_code', () => {
        const invalidData = {
          metadata: {
            source: '상품마스터',
            generated_at: '2026-02-23',
            total_constraints: 1,
          },
          constraints: [
            {
              sheet_name: '디지털인쇄',
              constraint_type: 'size_show',
              rule_text: '★test',
              description: 'test',
              row: 1,
              col: 1,
              product_name: 'test',
            },
          ],
        };

        expect(() =>
          OptionConstraintsJsonSchema.parse(invalidData),
        ).toThrow(ZodError);
      });
    });
  });

  // ============================================================
  // 3. loadAndValidate helper tests
  // ============================================================

  describe('loadAndValidate helper', () => {
    it('throws for non-existent file (readFileSync ENOENT)', () => {
      const nonExistentPath = resolve(PRICING_DIR, 'does-not-exist.json');

      expect(() =>
        loadAndValidate(PaperJsonSchema, nonExistentPath),
      ).toThrow();
    });

    it('throws for invalid JSON content', () => {
      const invalidPath = '/tmp/test-invalid-json-seed-schemas-test.json';
      try {
        writeFileSync(invalidPath, '{ invalid json content }}}');
        expect(() =>
          loadAndValidate(PaperJsonSchema, invalidPath),
        ).toThrow();
      } finally {
        try {
          unlinkSync(invalidPath);
        } catch {
          // Cleanup best effort
        }
      }
    });

    it('returns parsed data for valid file', () => {
      const paperPath = resolve(PRICING_DIR, 'paper.json');
      const data = loadAndValidate(PaperJsonSchema, paperPath);

      expect(data).toBeDefined();
      expect(data.papers).toBeDefined();
      expect(Array.isArray(data.papers)).toBe(true);
    });

    it('throws ZodError when schema validation fails', () => {
      // Use a valid JSON file that doesn't match the expected schema
      const goodsPath = resolve(PRICING_DIR, 'products', 'goods.json');

      // goods.json doesn't match PaperJsonSchema (has 'data' not 'papers')
      expect(() =>
        loadAndValidate(PaperJsonSchema, goodsPath),
      ).toThrow(ZodError);
    });
  });
});
