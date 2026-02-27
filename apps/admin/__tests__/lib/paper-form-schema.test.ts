/**
 * Tests for Paper form Zod schema validation.
 * REQ-E-201: Paper CRUD form validation.
 *
 * Re-declares the schema (same as paper-form.tsx) since it's not exported.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare paperFormSchema (same as paper-form.tsx)
const paperFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or fewer'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  abbreviation: z.string().max(20).nullable().optional(),
  weight: z.number().int().positive().nullable().optional(),
  sheetSize: z.string().max(50).nullable().optional(),
  costPerReam: z.string().nullable().optional(),
  sellingPerReam: z.string().nullable().optional(),
  costPer4Cut: z.string().nullable().optional(),
  sellingPer4Cut: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

describe('paperFormSchema', () => {
  const validPaper = {
    code: 'SC-200',
    name: 'Snow Cotton 200g',
    abbreviation: 'SC200',
    weight: 200,
    sheetSize: 'A3',
    costPerReam: '1000',
    sellingPerReam: '1500',
    costPer4Cut: '250',
    sellingPer4Cut: '375',
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid paper data', () => {
    const result = paperFormSchema.safeParse(validPaper);
    expect(result.success).toBe(true);
  });

  it('accepts minimal required fields only', () => {
    const result = paperFormSchema.safeParse({
      code: 'SC-200',
      name: 'Snow Cotton 200g',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
      expect(result.data.isActive).toBe(true);
    }
  });

  describe('code field', () => {
    it('requires code', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        code: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects code over 50 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        code: 'X'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('accepts code at exactly 50 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        code: 'X'.repeat(50),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('name field', () => {
    it('requires name', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects name over 100 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        name: 'X'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts name at exactly 100 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        name: 'X'.repeat(100),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('abbreviation field', () => {
    it('accepts null abbreviation', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        abbreviation: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects abbreviation over 20 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        abbreviation: 'X'.repeat(21),
      });
      expect(result.success).toBe(false);
    });

    it('accepts abbreviation at 20 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        abbreviation: 'X'.repeat(20),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('weight field', () => {
    it('accepts null weight', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        weight: null,
      });
      expect(result.success).toBe(true);
    });

    it('requires weight to be positive', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        weight: 0,
      });
      expect(result.success).toBe(false);
    });

    it('requires weight to be an integer', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        weight: 150.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        weight: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sheetSize field', () => {
    it('accepts null sheetSize', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        sheetSize: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects sheetSize over 50 characters', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        sheetSize: 'X'.repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('price fields', () => {
    it('accepts null price fields', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        costPerReam: null,
        sellingPerReam: null,
        costPer4Cut: null,
        sellingPer4Cut: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts string price values', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        costPerReam: '1500.50',
        sellingPerReam: '2000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('displayOrder field', () => {
    it('defaults to 0', () => {
      const result = paperFormSchema.safeParse({
        code: 'SC-200',
        name: 'Snow Cotton',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayOrder).toBe(0);
      }
    });

    it('rejects negative displayOrder', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        displayOrder: -1,
      });
      expect(result.success).toBe(false);
    });

    it('requires displayOrder to be an integer', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        displayOrder: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('isActive field', () => {
    it('defaults to true', () => {
      const result = paperFormSchema.safeParse({
        code: 'SC-200',
        name: 'Snow Cotton',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    it('accepts false', () => {
      const result = paperFormSchema.safeParse({
        ...validPaper,
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });
});
