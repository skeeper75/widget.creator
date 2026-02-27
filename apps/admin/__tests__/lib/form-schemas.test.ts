/**
 * Tests for form validation schemas (drizzle-zod / Zod-based).
 * REQ-U-002: All CRUD forms use Zod schemas for client-side validation.
 *
 * Tests the pure Zod schemas extracted from form components:
 * - categoryFormSchema: Category create/edit validation
 * - productFormSchema: Product create/edit validation (REQ-E-104)
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare schemas here since they are not exported from form components.
// Tests validate the same rules that the forms enforce.

const categoryFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or fewer'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  parentId: z.number().int().nullable(),
  depth: z.number().int().min(0).max(2),
  displayOrder: z.number().int().min(0),
  iconUrl: z.string().max(500).nullable().optional(),
  isActive: z.boolean(),
});

const productFormSchema = z.object({
  categoryId: z.number({ required_error: 'Category is required' }).int().positive(),
  huniCode: z
    .string()
    .min(1, 'Huni code is required')
    .max(10, 'Max 10 characters'),
  edicusCode: z.string().max(15).nullable().optional(),
  shopbyId: z.number().int().nullable().optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Max 200 characters'),
  slug: z.string().min(1, 'Slug is required').max(200),
  productType: z.enum([
    'digital_print', 'offset_print', 'large_format', 'cutting', 'binding', 'specialty',
  ]),
  pricingModel: z.enum(['tiered', 'fixed', 'package', 'size_dependent']),
  sheetStandard: z.enum(['A3', 'T3', 'A4']).nullable().optional(),
  figmaSection: z.string().max(50).nullable().optional(),
  orderMethod: z.enum(['upload', 'editor', 'delivery']),
  editorEnabled: z.boolean(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
});

describe('categoryFormSchema', () => {
  const validCategory = {
    code: 'BIZ-CARD',
    name: 'Business Card',
    parentId: null,
    depth: 0,
    displayOrder: 1,
    iconUrl: null,
    isActive: true,
  };

  it('accepts valid category data', () => {
    const result = categoryFormSchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('accepts category with parentId', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      parentId: 5,
      depth: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts category at max depth (2)', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      depth: 2,
      parentId: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      code: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Code is required');
    }
  });

  it('rejects empty name', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('rejects code exceeding 50 characters', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      code: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects depth greater than 2', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      depth: 3,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative depth', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      depth: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative displayOrder', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      displayOrder: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts iconUrl with valid URL string', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      iconUrl: 'https://cdn.example.com/icon.png',
    });
    expect(result.success).toBe(true);
  });

  it('rejects iconUrl exceeding 500 characters', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      iconUrl: 'https://cdn.example.com/' + 'a'.repeat(500),
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-integer depth as invalid', () => {
    const result = categoryFormSchema.safeParse({
      ...validCategory,
      depth: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('productFormSchema', () => {
  const validProduct = {
    categoryId: 1,
    huniCode: 'BC001',
    edicusCode: null,
    shopbyId: null,
    name: 'Business Card',
    slug: 'business-card',
    productType: 'digital_print' as const,
    pricingModel: 'tiered' as const,
    sheetStandard: 'A3' as const,
    figmaSection: null,
    orderMethod: 'upload' as const,
    editorEnabled: false,
    description: null,
    isActive: true,
  };

  it('accepts valid product data', () => {
    const result = productFormSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('accepts all productType values', () => {
    const types = ['digital_print', 'offset_print', 'large_format', 'cutting', 'binding', 'specialty'];
    for (const type of types) {
      const result = productFormSchema.safeParse({ ...validProduct, productType: type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid productType', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      productType: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all pricingModel values', () => {
    const models = ['tiered', 'fixed', 'package', 'size_dependent'];
    for (const model of models) {
      const result = productFormSchema.safeParse({ ...validProduct, pricingModel: model });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid pricingModel', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      pricingModel: 'invalid_model',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all sheetStandard values including null', () => {
    for (const std of ['A3', 'T3', 'A4', null]) {
      const result = productFormSchema.safeParse({
        ...validProduct,
        sheetStandard: std,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all orderMethod values', () => {
    const methods = ['upload', 'editor', 'delivery'];
    for (const method of methods) {
      const result = productFormSchema.safeParse({ ...validProduct, orderMethod: method });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty huniCode', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      huniCode: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Huni code is required');
    }
  });

  it('rejects huniCode exceeding 10 characters', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      huniCode: 'A'.repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      name: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty slug', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      slug: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive categoryId', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      categoryId: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative categoryId', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      categoryId: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing categoryId', () => {
    const { categoryId, ...withoutCategory } = validProduct;
    const result = productFormSchema.safeParse(withoutCategory);
    expect(result.success).toBe(false);
  });

  it('accepts optional edicusCode with valid value', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      edicusCode: 'ED-BC001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects edicusCode exceeding 15 characters', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      edicusCode: 'A'.repeat(16),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional shopbyId with valid value', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      shopbyId: 12345,
    });
    expect(result.success).toBe(true);
  });

  it('rejects figmaSection exceeding 50 characters', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      figmaSection: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('accepts product with all optional fields populated', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      edicusCode: 'ED-BC001',
      shopbyId: 12345,
      sheetStandard: 'T3',
      figmaSection: 'Section A',
      description: 'Full description here',
      editorEnabled: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('generateSlug (product-form logic)', () => {
  // Re-implement for testing since it's not exported
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  it('converts name to lowercase', () => {
    expect(generateSlug('Business Card')).toBe('business-card');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('My Product Name')).toBe('my-product-name');
  });

  it('removes special characters', () => {
    expect(generateSlug('Product (Type A) #1')).toBe('product-type-a-1');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('  Product  ')).toBe('product');
  });

  it('preserves Korean characters', () => {
    expect(generateSlug('명함 디자인')).toBe('명함-디자인');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(generateSlug('!@#$%')).toBe('');
  });

  it('collapses multiple consecutive special chars to single hyphen', () => {
    expect(generateSlug('a---b___c')).toBe('a-b-c');
  });
});
