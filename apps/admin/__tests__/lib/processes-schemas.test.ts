/**
 * Tests for Process domain form validation schemas.
 * REQ-E-303: Binding minPages < maxPages, pageStep > 0.
 * REQ-E-304: Imposition rules uniqueness validation.
 *
 * Re-declares schemas from page components (same validation logic).
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- Binding form schema (same as bindings/page.tsx) ---
const bindingFormSchema = z
  .object({
    code: z.string().min(1, 'Code is required').max(50),
    name: z.string().min(1, 'Name is required').max(50),
    minPages: z.coerce.number().int().positive().nullable().default(null),
    maxPages: z.coerce.number().int().positive().nullable().default(null),
    pageStep: z.coerce.number().int().positive().nullable().default(null),
    displayOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.minPages != null && data.maxPages != null) {
        return data.minPages < data.maxPages;
      }
      return true;
    },
    { message: 'minPages must be less than maxPages', path: ['maxPages'] },
  )
  .refine(
    (data) => {
      if (data.pageStep != null) {
        return data.pageStep > 0;
      }
      return true;
    },
    { message: 'pageStep must be greater than 0', path: ['pageStep'] },
  );

// --- Imposition form schema (same as imposition/page.tsx) ---
const impositionFormSchema = z.object({
  cutSizeCode: z.string().min(1, 'Cut size code is required').max(30),
  cutWidth: z.string().min(1, 'Cut width is required'),
  cutHeight: z.string().min(1, 'Cut height is required'),
  workWidth: z.string().min(1, 'Work width is required'),
  workHeight: z.string().min(1, 'Work height is required'),
  impositionCount: z.coerce.number().int().positive('Must be positive'),
  sheetStandard: z.string().min(1, 'Sheet standard is required').max(5),
  description: z.string().max(200).nullable().default(null),
  isActive: z.boolean().default(true),
});

// --- Print mode form schema (inferred from print-modes/page.tsx pattern) ---
const printModeFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(50),
  sides: z.coerce.number().int().min(1).max(2),
  colorType: z.string().min(1, 'Color type is required'),
  priceCode: z.string().max(50).nullable().default(null),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// --- Post-process form schema (inferred from post-processes/page.tsx pattern) ---
const postProcessFormSchema = z.object({
  groupCode: z.string().min(1, 'Group code is required').max(50),
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  processType: z.string().min(1, 'Process type is required'),
  subOptionCode: z.string().max(50).nullable().default(null),
  subOptionName: z.string().max(100).nullable().default(null),
  priceBasis: z.string().max(20).nullable().default(null),
  sheetStandard: z.string().max(5).nullable().default(null),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// ===================================================================
// Tests
// ===================================================================

describe('bindingFormSchema', () => {
  const validBinding = {
    code: 'SADDLE_STITCH',
    name: 'Saddle Stitch',
    minPages: 8,
    maxPages: 64,
    pageStep: 4,
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid binding', () => {
    const result = bindingFormSchema.safeParse(validBinding);
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = bindingFormSchema.safeParse({ ...validBinding, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = bindingFormSchema.safeParse({ ...validBinding, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects code exceeding 50 characters', () => {
    const result = bindingFormSchema.safeParse({
      ...validBinding,
      code: 'X'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('accepts null minPages and maxPages', () => {
    const result = bindingFormSchema.safeParse({
      ...validBinding,
      minPages: null,
      maxPages: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null pageStep', () => {
    const result = bindingFormSchema.safeParse({
      ...validBinding,
      pageStep: null,
    });
    expect(result.success).toBe(true);
  });

  describe('REQ-E-303: minPages < maxPages', () => {
    it('accepts minPages < maxPages', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: 8,
        maxPages: 64,
      });
      expect(result.success).toBe(true);
    });

    it('rejects minPages >= maxPages', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: 64,
        maxPages: 8,
      });
      expect(result.success).toBe(false);
    });

    it('rejects minPages === maxPages', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: 32,
        maxPages: 32,
      });
      expect(result.success).toBe(false);
    });

    it('skips check when minPages is null', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: null,
        maxPages: 64,
      });
      expect(result.success).toBe(true);
    });

    it('skips check when maxPages is null', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: 8,
        maxPages: null,
      });
      expect(result.success).toBe(true);
    });

    it('includes path maxPages in error', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        minPages: 100,
        maxPages: 10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const maxPagesError = result.error.issues.find(
          (i) => i.path.includes('maxPages'),
        );
        expect(maxPagesError).toBeDefined();
      }
    });
  });

  describe('REQ-E-303: pageStep > 0', () => {
    it('accepts positive pageStep', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        pageStep: 4,
      });
      expect(result.success).toBe(true);
    });

    it('accepts pageStep = 1', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        pageStep: 1,
      });
      expect(result.success).toBe(true);
    });

    it('rejects pageStep = 0 (z.positive rejects it)', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        pageStep: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative pageStep', () => {
      const result = bindingFormSchema.safeParse({
        ...validBinding,
        pageStep: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('displayOrder defaults', () => {
    it('defaults displayOrder to 0', () => {
      const result = bindingFormSchema.safeParse({
        code: 'TEST',
        name: 'Test',
        minPages: null,
        maxPages: null,
        pageStep: null,
        isActive: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayOrder).toBe(0);
      }
    });
  });
});

describe('impositionFormSchema', () => {
  const validImposition = {
    cutSizeCode: 'A4',
    cutWidth: '210.00',
    cutHeight: '297.00',
    workWidth: '216.00',
    workHeight: '303.00',
    impositionCount: 2,
    sheetStandard: 'A3',
    description: null,
    isActive: true,
  };

  it('accepts valid imposition rule', () => {
    const result = impositionFormSchema.safeParse(validImposition);
    expect(result.success).toBe(true);
  });

  it('rejects empty cutSizeCode', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      cutSizeCode: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects cutSizeCode exceeding 30 chars', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      cutSizeCode: 'X'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty cutWidth', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      cutWidth: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty cutHeight', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      cutHeight: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty workWidth', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      workWidth: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty workHeight', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      workHeight: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero impositionCount', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      impositionCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative impositionCount', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      impositionCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty sheetStandard', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      sheetStandard: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects sheetStandard exceeding 5 chars', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      sheetStandard: 'XXXXXX',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects description exceeding 200 chars', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      description: 'X'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description with text', () => {
    const result = impositionFormSchema.safeParse({
      ...validImposition,
      description: 'Standard A4 on A3 sheet',
    });
    expect(result.success).toBe(true);
  });
});

describe('impositionFormSchema - REQ-E-304: uniqueness check logic', () => {
  // Re-implement duplicate detection (same as imposition/page.tsx checkDuplicate)
  interface ImpositionRule {
    id: number;
    cutWidth: string;
    cutHeight: string;
    sheetStandard: string;
  }

  function checkDuplicate(
    existing: ImpositionRule[],
    cutWidth: string,
    cutHeight: string,
    sheetStandard: string,
    editingId: number | null,
  ): string | null {
    if (!cutWidth || !cutHeight || !sheetStandard) return null;

    const duplicate = existing.find(
      (d) =>
        d.cutWidth === cutWidth &&
        d.cutHeight === cutHeight &&
        d.sheetStandard === sheetStandard &&
        d.id !== editingId,
    );

    return duplicate
      ? `Duplicate: ${cutWidth}x${cutHeight} already exists for ${sheetStandard} (ID: ${duplicate.id})`
      : null;
  }

  it('returns null for empty fields', () => {
    expect(checkDuplicate([], '', '297.00', 'A3', null)).toBeNull();
    expect(checkDuplicate([], '210.00', '', 'A3', null)).toBeNull();
    expect(checkDuplicate([], '210.00', '297.00', '', null)).toBeNull();
  });

  it('returns null when no duplicates', () => {
    const existing = [
      { id: 1, cutWidth: '210.00', cutHeight: '297.00', sheetStandard: 'A3' },
    ];
    const result = checkDuplicate(existing, '100.00', '200.00', 'A3', null);
    expect(result).toBeNull();
  });

  it('returns warning for duplicate cutWidth x cutHeight in same sheetStandard', () => {
    const existing = [
      { id: 1, cutWidth: '210.00', cutHeight: '297.00', sheetStandard: 'A3' },
    ];
    const result = checkDuplicate(existing, '210.00', '297.00', 'A3', null);
    expect(result).toContain('Duplicate');
    expect(result).toContain('210.00x297.00');
    expect(result).toContain('ID: 1');
  });

  it('allows same dimensions in different sheetStandard', () => {
    const existing = [
      { id: 1, cutWidth: '210.00', cutHeight: '297.00', sheetStandard: 'A3' },
    ];
    const result = checkDuplicate(existing, '210.00', '297.00', 'T3', null);
    expect(result).toBeNull();
  });

  it('excludes own ID when editing', () => {
    const existing = [
      { id: 1, cutWidth: '210.00', cutHeight: '297.00', sheetStandard: 'A3' },
    ];
    const result = checkDuplicate(existing, '210.00', '297.00', 'A3', 1);
    expect(result).toBeNull();
  });

  it('detects duplicate when editing a different record', () => {
    const existing = [
      { id: 1, cutWidth: '210.00', cutHeight: '297.00', sheetStandard: 'A3' },
      { id: 2, cutWidth: '100.00', cutHeight: '200.00', sheetStandard: 'A3' },
    ];
    const result = checkDuplicate(existing, '210.00', '297.00', 'A3', 2);
    expect(result).toContain('Duplicate');
  });
});

describe('printModeFormSchema', () => {
  const validPrintMode = {
    code: 'CMYK_BOTH',
    name: 'CMYK Both Sides',
    sides: 2,
    colorType: 'cmyk',
    priceCode: 'PM_CMYK_BOTH',
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid print mode', () => {
    const result = printModeFormSchema.safeParse(validPrintMode);
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts sides = 1', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, sides: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts sides = 2', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, sides: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects sides = 0', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, sides: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects sides = 3', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, sides: 3 });
    expect(result.success).toBe(false);
  });

  it('accepts null priceCode', () => {
    const result = printModeFormSchema.safeParse({ ...validPrintMode, priceCode: null });
    expect(result.success).toBe(true);
  });
});

describe('postProcessFormSchema', () => {
  const validPostProcess = {
    groupCode: 'COATING',
    code: 'UV_FULL',
    name: 'UV Full Coating',
    processType: 'surface',
    subOptionCode: null,
    subOptionName: null,
    priceBasis: 'sheet',
    sheetStandard: 'A3',
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid post-process', () => {
    const result = postProcessFormSchema.safeParse(validPostProcess);
    expect(result.success).toBe(true);
  });

  it('rejects empty groupCode', () => {
    const result = postProcessFormSchema.safeParse({ ...validPostProcess, groupCode: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty code', () => {
    const result = postProcessFormSchema.safeParse({ ...validPostProcess, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = postProcessFormSchema.safeParse({ ...validPostProcess, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty processType', () => {
    const result = postProcessFormSchema.safeParse({ ...validPostProcess, processType: '' });
    expect(result.success).toBe(false);
  });

  it('accepts null subOptionCode and subOptionName', () => {
    const result = postProcessFormSchema.safeParse({
      ...validPostProcess,
      subOptionCode: null,
      subOptionName: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null priceBasis', () => {
    const result = postProcessFormSchema.safeParse({
      ...validPostProcess,
      priceBasis: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null sheetStandard', () => {
    const result = postProcessFormSchema.safeParse({
      ...validPostProcess,
      sheetStandard: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects name exceeding 100 chars', () => {
    const result = postProcessFormSchema.safeParse({
      ...validPostProcess,
      name: 'X'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects sheetStandard exceeding 5 chars', () => {
    const result = postProcessFormSchema.safeParse({
      ...validPostProcess,
      sheetStandard: 'XXXXXX',
    });
    expect(result.success).toBe(false);
  });
});
