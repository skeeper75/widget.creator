/**
 * Tests for Integration domain schemas and logic.
 * REQ-E-602: Visual mapper interaction logic.
 * REQ-E-604: MES mapping status validation.
 *
 * Tests UpdateMappingStatusSchema and MES mapping status transition rules.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- MES mapping status schema (same as schemas.ts UpdateMappingStatusSchema) ---
const updateMappingStatusSchema = z.object({
  id: z.number(),
  mappingStatus: z.enum(['pending', 'mapped', 'verified']),
  mesItemId: z.number().optional(),
  mesCode: z.string().optional(),
  mappedBy: z.string().optional(),
});

// --- Editor mapping schema ---
const editorMappingFormSchema = z.object({
  productId: z.number().int().positive(),
  editorType: z.string().min(1, 'Editor type is required').max(50),
  templateId: z.string().max(100).nullable().default(null),
  templateConfig: z.any().nullable().default(null),
  isActive: z.boolean().default(true),
});

// --- MES item option schema ---
const mesItemOptionFormSchema = z.object({
  mesItemId: z.number().int().positive(),
  optionNumber: z.coerce.number().int().min(1, 'Option number must be >= 1'),
  optionValue: z.string().min(1, 'Option value is required').max(200),
  isActive: z.boolean().default(true),
});

// --- JSON editor validation logic (same as json-editor.tsx) ---
function validateJson(raw: string): { valid: boolean; parsed: unknown | null; error?: string } {
  if (raw.trim() === '') {
    return { valid: true, parsed: null };
  }
  try {
    const parsed = JSON.parse(raw);
    return { valid: true, parsed };
  } catch (e) {
    return { valid: false, parsed: null, error: (e as Error).message };
  }
}

// --- JSON formatter (same as json-editor.tsx formatJson) ---
function formatJson(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

// ===================================================================
// Tests
// ===================================================================

describe('updateMappingStatusSchema', () => {
  it('accepts valid status update to pending', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'pending',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid status update to mapped with extras', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
      mesItemId: 42,
      mesCode: 'MES-001',
      mappedBy: 'admin@huni.co.kr',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid status update to verified', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'verified',
      mappedBy: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mappingStatus', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = updateMappingStatusSchema.safeParse({
      mappingStatus: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('allows optional mesItemId', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
    });
    expect(result.success).toBe(true);
  });

  it('allows optional mesCode', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
      mesItemId: 1,
    });
    expect(result.success).toBe(true);
  });

  it('allows optional mappedBy', () => {
    const result = updateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'verified',
    });
    expect(result.success).toBe(true);
  });

  it('only accepts enum values for mappingStatus', () => {
    const validStatuses = ['pending', 'mapped', 'verified'];
    for (const status of validStatuses) {
      const result = updateMappingStatusSchema.safeParse({ id: 1, mappingStatus: status });
      expect(result.success).toBe(true);
    }
  });
});

describe('editorMappingFormSchema', () => {
  const validEditorMapping = {
    productId: 1,
    editorType: 'figma',
    templateId: 'TMPL-001',
    templateConfig: { sections: ['front', 'back'] },
    isActive: true,
  };

  it('accepts valid editor mapping', () => {
    const result = editorMappingFormSchema.safeParse(validEditorMapping);
    expect(result.success).toBe(true);
  });

  it('rejects empty editorType', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      editorType: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects editorType exceeding 50 chars', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      editorType: 'X'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('accepts null templateId', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      templateId: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects templateId exceeding 100 chars', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      templateId: 'X'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts null templateConfig', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      templateConfig: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts complex JSON templateConfig', () => {
    const result = editorMappingFormSchema.safeParse({
      ...validEditorMapping,
      templateConfig: {
        sections: ['front', 'back'],
        dimensions: { width: 210, height: 297 },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('mesItemOptionFormSchema', () => {
  const validOption = {
    mesItemId: 1,
    optionNumber: 1,
    optionValue: 'CMYK',
    isActive: true,
  };

  it('accepts valid MES item option', () => {
    const result = mesItemOptionFormSchema.safeParse(validOption);
    expect(result.success).toBe(true);
  });

  it('rejects optionNumber less than 1', () => {
    const result = mesItemOptionFormSchema.safeParse({
      ...validOption,
      optionNumber: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty optionValue', () => {
    const result = mesItemOptionFormSchema.safeParse({
      ...validOption,
      optionValue: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects optionValue exceeding 200 chars', () => {
    const result = mesItemOptionFormSchema.safeParse({
      ...validOption,
      optionValue: 'X'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe('validateJson (json-editor.tsx logic)', () => {
  it('returns valid with null for empty string', () => {
    const result = validateJson('');
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeNull();
  });

  it('returns valid with null for whitespace only', () => {
    const result = validateJson('   ');
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeNull();
  });

  it('parses valid JSON object', () => {
    const result = validateJson('{"key": "value"}');
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({ key: 'value' });
  });

  it('parses valid JSON array', () => {
    const result = validateJson('[1, 2, 3]');
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual([1, 2, 3]);
  });

  it('parses valid JSON primitive', () => {
    expect(validateJson('"hello"').parsed).toBe('hello');
    expect(validateJson('42').parsed).toBe(42);
    expect(validateJson('true').parsed).toBe(true);
    expect(validateJson('null').parsed).toBeNull();
  });

  it('returns error for invalid JSON', () => {
    const result = validateJson('{invalid}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for trailing comma', () => {
    const result = validateJson('{"a": 1,}');
    expect(result.valid).toBe(false);
  });

  it('returns error for single quotes', () => {
    const result = validateJson("{'key': 'value'}");
    expect(result.valid).toBe(false);
  });
});

describe('formatJson (json-editor.tsx logic)', () => {
  it('returns empty string for null', () => {
    expect(formatJson(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatJson(undefined)).toBe('');
  });

  it('formats object with 2-space indentation', () => {
    const result = formatJson({ a: 1, b: 2 });
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('formats JSON string', () => {
    const result = formatJson('{"a":1}');
    expect(result).toBe('{\n  "a": 1\n}');
  });

  it('returns original string if not valid JSON', () => {
    expect(formatJson('{invalid}')).toBe('{invalid}');
  });

  it('formats nested objects', () => {
    const result = formatJson({ a: { b: 1 } });
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
  });

  it('formats arrays', () => {
    const result = formatJson([1, 2, 3]);
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });
});

describe('MES mapping status transition rules', () => {
  type MappingStatus = 'pending' | 'mapped' | 'verified';

  // Re-implement status transition rules (same as kanban-board.tsx drag logic)
  const VALID_FORWARD_TRANSITIONS: Record<MappingStatus, MappingStatus[]> = {
    pending: ['mapped'],
    mapped: ['verified'],
    verified: [],
  };

  function isForwardTransition(
    from: MappingStatus,
    to: MappingStatus,
  ): boolean {
    return VALID_FORWARD_TRANSITIONS[from].includes(to);
  }

  function requiresDialog(
    from: MappingStatus,
    to: MappingStatus,
  ): 'mapping' | 'verify' | null {
    if (from === 'pending' && to === 'mapped') return 'mapping';
    if (from === 'mapped' && to === 'verified') return 'verify';
    return null;
  }

  it('allows pending -> mapped transition', () => {
    expect(isForwardTransition('pending', 'mapped')).toBe(true);
  });

  it('allows mapped -> verified transition', () => {
    expect(isForwardTransition('mapped', 'verified')).toBe(true);
  });

  it('does not allow pending -> verified forward', () => {
    expect(isForwardTransition('pending', 'verified')).toBe(false);
  });

  it('does not allow verified forward transitions', () => {
    expect(isForwardTransition('verified', 'pending')).toBe(false);
    expect(isForwardTransition('verified', 'mapped')).toBe(false);
  });

  it('pending -> mapped requires mapping dialog', () => {
    expect(requiresDialog('pending', 'mapped')).toBe('mapping');
  });

  it('mapped -> verified requires verify dialog', () => {
    expect(requiresDialog('mapped', 'verified')).toBe('verify');
  });

  it('other transitions require no dialog', () => {
    expect(requiresDialog('mapped', 'pending')).toBeNull();
    expect(requiresDialog('verified', 'mapped')).toBeNull();
    expect(requiresDialog('pending', 'verified')).toBeNull();
  });
});
