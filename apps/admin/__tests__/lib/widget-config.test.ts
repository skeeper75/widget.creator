/**
 * Tests for Widget configuration and form validation.
 * REQ-E-701: Widget CRUD, embed code, status management.
 *
 * Tests widget form schema, status badge logic, and embed code template.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- Widget create schema (same as widget list page create logic) ---
const widgetCreateSchema = z.object({
  name: z.string().min(1, 'Widget name is required').max(200),
  widgetId: z.string().min(1).max(50),
});

// --- Widget update schema ---
const widgetUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  shopUrl: z.string().url().max(500).nullable().optional(),
  theme: z.string().max(50).nullable().optional(),
  apiKey: z.string().max(200).nullable().optional(),
  allowedOrigins: z.string().max(1000).nullable().optional(),
  features: z.any().nullable().optional(),
});

// --- Widget status badge logic (same as widget list page) ---
function getStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'draft') return 'secondary';
  return 'outline';
}

// --- Widget ID generation (same pattern as widget list page) ---
function generateWidgetId(): string {
  // Simulates crypto.randomUUID().slice(0, 8)
  return 'xxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

// --- Widget name validation (same as create button logic) ---
function validateWidgetName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Widget name is required' };
  }
  return { valid: true };
}

// --- Embed code generation (same as widget-embed test) ---
function generateEmbedCode(widgetId: string, baseUrl?: string): string {
  const url = baseUrl ?? 'https://widget.huniprinting.com';
  return `<script src="${url}/embed.js" data-widget-id="${widgetId}"></script>`;
}

// --- Active badge logic (same as widget list page isActive column) ---
function getActiveBadge(isActive: boolean): { label: string; variant: 'default' | 'secondary' } {
  return isActive
    ? { label: 'Active', variant: 'default' }
    : { label: 'Inactive', variant: 'secondary' };
}

// ===================================================================
// Tests
// ===================================================================

describe('widgetCreateSchema', () => {
  it('accepts valid widget create input', () => {
    const result = widgetCreateSchema.safeParse({
      name: 'My Widget',
      widgetId: 'abc12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = widgetCreateSchema.safeParse({
      name: '',
      widgetId: 'abc12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 chars', () => {
    const result = widgetCreateSchema.safeParse({
      name: 'X'.repeat(201),
      widgetId: 'abc12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty widgetId', () => {
    const result = widgetCreateSchema.safeParse({
      name: 'Widget',
      widgetId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects widgetId exceeding 50 chars', () => {
    const result = widgetCreateSchema.safeParse({
      name: 'Widget',
      widgetId: 'X'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe('widgetUpdateSchema', () => {
  it('accepts empty update', () => {
    const result = widgetUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts name update', () => {
    const result = widgetUpdateSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts all status values', () => {
    for (const status of ['draft', 'active', 'inactive'] as const) {
      const result = widgetUpdateSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = widgetUpdateSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts valid shopUrl', () => {
    const result = widgetUpdateSchema.safeParse({
      shopUrl: 'https://shop.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid shopUrl', () => {
    const result = widgetUpdateSchema.safeParse({
      shopUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null shopUrl', () => {
    const result = widgetUpdateSchema.safeParse({ shopUrl: null });
    expect(result.success).toBe(true);
  });

  it('accepts null theme', () => {
    const result = widgetUpdateSchema.safeParse({ theme: null });
    expect(result.success).toBe(true);
  });

  it('accepts theme value', () => {
    const result = widgetUpdateSchema.safeParse({ theme: 'dark' });
    expect(result.success).toBe(true);
  });

  it('rejects theme exceeding 50 chars', () => {
    const result = widgetUpdateSchema.safeParse({ theme: 'X'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts null features', () => {
    const result = widgetUpdateSchema.safeParse({ features: null });
    expect(result.success).toBe(true);
  });

  it('accepts complex features object', () => {
    const result = widgetUpdateSchema.safeParse({
      features: { pricing: true, customization: false },
    });
    expect(result.success).toBe(true);
  });
});

describe('getStatusBadgeVariant', () => {
  it('returns default for active status', () => {
    expect(getStatusBadgeVariant('active')).toBe('default');
  });

  it('returns secondary for draft status', () => {
    expect(getStatusBadgeVariant('draft')).toBe('secondary');
  });

  it('returns outline for inactive status', () => {
    expect(getStatusBadgeVariant('inactive')).toBe('outline');
  });

  it('returns outline for unknown status', () => {
    expect(getStatusBadgeVariant('unknown')).toBe('outline');
  });
});

describe('generateWidgetId', () => {
  it('generates 8-character string', () => {
    const id = generateWidgetId();
    expect(id).toHaveLength(8);
  });

  it('generates hexadecimal characters only', () => {
    const id = generateWidgetId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateWidgetId()));
    expect(ids.size).toBeGreaterThan(1); // Extremely unlikely all same
  });
});

describe('validateWidgetName', () => {
  it('accepts non-empty name', () => {
    expect(validateWidgetName('My Widget')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateWidgetName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects whitespace-only string', () => {
    const result = validateWidgetName('   ');
    expect(result.valid).toBe(false);
  });

  it('trims before validation', () => {
    expect(validateWidgetName('  Widget  ')).toEqual({ valid: true });
  });
});

describe('generateEmbedCode', () => {
  it('generates script tag with default URL', () => {
    const code = generateEmbedCode('abc123');
    expect(code).toBe(
      '<script src="https://widget.huniprinting.com/embed.js" data-widget-id="abc123"></script>',
    );
  });

  it('uses custom base URL', () => {
    const code = generateEmbedCode('xyz', 'https://cdn.custom.com');
    expect(code).toBe(
      '<script src="https://cdn.custom.com/embed.js" data-widget-id="xyz"></script>',
    );
  });

  it('includes data-widget-id attribute', () => {
    const code = generateEmbedCode('test-id');
    expect(code).toContain('data-widget-id="test-id"');
  });

  it('includes embed.js path', () => {
    const code = generateEmbedCode('id');
    expect(code).toContain('/embed.js');
  });
});

describe('getActiveBadge', () => {
  it('returns Active with default variant when true', () => {
    const badge = getActiveBadge(true);
    expect(badge.label).toBe('Active');
    expect(badge.variant).toBe('default');
  });

  it('returns Inactive with secondary variant when false', () => {
    const badge = getActiveBadge(false);
    expect(badge.label).toBe('Inactive');
    expect(badge.variant).toBe('secondary');
  });
});

describe('widget status filter logic', () => {
  // Re-implement filter options extraction (same as widget list page)
  function extractStatusFilterOptions(
    widgets: { status: string }[],
  ): { label: string; value: string }[] {
    return [...new Set(widgets.map((w) => w.status))].map((s) => ({
      label: s,
      value: s,
    }));
  }

  it('returns empty for empty widgets', () => {
    expect(extractStatusFilterOptions([])).toHaveLength(0);
  });

  it('extracts unique statuses', () => {
    const widgets = [
      { status: 'active' },
      { status: 'draft' },
      { status: 'active' },
      { status: 'inactive' },
    ];
    const options = extractStatusFilterOptions(widgets);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toContain('active');
    expect(options.map((o) => o.value)).toContain('draft');
    expect(options.map((o) => o.value)).toContain('inactive');
  });

  it('deduplicates same status', () => {
    const widgets = [
      { status: 'active' },
      { status: 'active' },
    ];
    const options = extractStatusFilterOptions(widgets);
    expect(options).toHaveLength(1);
  });
});
