/**
 * Tests for Settings router input schema validation.
 * REQ-E-801: Admin settings management.
 *
 * Re-declares the settings update schema (same as settings.ts router).
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare settings update schema (same as settings.ts)
const settingsUpdateSchema = z.object({
  siteName: z.string().optional(),
  defaultPageSize: z.number().min(10).max(100).optional(),
  enableAuditLog: z.boolean().optional(),
});

// Re-declare default settings (same as settings.ts)
const defaultSettings = {
  siteName: 'HuniPrinting Admin',
  defaultPageSize: 20,
  enableAuditLog: false,
};

describe('settingsUpdateSchema', () => {
  it('accepts empty update (no fields)', () => {
    const result = settingsUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts siteName update', () => {
    const result = settingsUpdateSchema.safeParse({
      siteName: 'Custom Admin Portal',
    });
    expect(result.success).toBe(true);
  });

  it('accepts defaultPageSize update', () => {
    const result = settingsUpdateSchema.safeParse({
      defaultPageSize: 50,
    });
    expect(result.success).toBe(true);
  });

  it('accepts enableAuditLog update', () => {
    const result = settingsUpdateSchema.safeParse({
      enableAuditLog: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all fields together', () => {
    const result = settingsUpdateSchema.safeParse({
      siteName: 'New Admin',
      defaultPageSize: 30,
      enableAuditLog: true,
    });
    expect(result.success).toBe(true);
  });

  describe('defaultPageSize constraints', () => {
    it('rejects page size below 10', () => {
      const result = settingsUpdateSchema.safeParse({
        defaultPageSize: 9,
      });
      expect(result.success).toBe(false);
    });

    it('accepts page size at 10 (minimum)', () => {
      const result = settingsUpdateSchema.safeParse({
        defaultPageSize: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects page size above 100', () => {
      const result = settingsUpdateSchema.safeParse({
        defaultPageSize: 101,
      });
      expect(result.success).toBe(false);
    });

    it('accepts page size at 100 (maximum)', () => {
      const result = settingsUpdateSchema.safeParse({
        defaultPageSize: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-number page size', () => {
      const result = settingsUpdateSchema.safeParse({
        defaultPageSize: 'twenty',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('settings merge logic', () => {
  function mergeSettings(
    current: typeof defaultSettings,
    update: Partial<typeof defaultSettings>,
  ) {
    return { ...current, ...update };
  }

  it('preserves unmodified fields', () => {
    const updated = mergeSettings(defaultSettings, { siteName: 'New Name' });
    expect(updated.siteName).toBe('New Name');
    expect(updated.defaultPageSize).toBe(20);
    expect(updated.enableAuditLog).toBe(false);
  });

  it('updates only specified fields', () => {
    const updated = mergeSettings(defaultSettings, { enableAuditLog: true });
    expect(updated.siteName).toBe('HuniPrinting Admin');
    expect(updated.enableAuditLog).toBe(true);
  });

  it('handles empty update (no-op)', () => {
    const updated = mergeSettings(defaultSettings, {});
    expect(updated).toEqual(defaultSettings);
  });

  it('updates all fields at once', () => {
    const updated = mergeSettings(defaultSettings, {
      siteName: 'Custom',
      defaultPageSize: 50,
      enableAuditLog: true,
    });
    expect(updated).toEqual({
      siteName: 'Custom',
      defaultPageSize: 50,
      enableAuditLog: true,
    });
  });
});

describe('default settings', () => {
  it('has correct default siteName', () => {
    expect(defaultSettings.siteName).toBe('HuniPrinting Admin');
  });

  it('has default page size of 20', () => {
    expect(defaultSettings.defaultPageSize).toBe(20);
  });

  it('has audit log disabled by default', () => {
    expect(defaultSettings.enableAuditLog).toBe(false);
  });
});
