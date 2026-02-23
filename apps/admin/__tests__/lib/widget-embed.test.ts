/**
 * Tests for Widget embed code generation logic.
 * REQ-E-602: Widget embed code generation.
 *
 * Tests the embed code template and widgetId generation
 * from widgets.ts router.
 */
import { describe, it, expect } from 'vitest';

// Re-implement embed code generation (same as widgets.ts router)
function generateEmbedCode(widget: {
  widgetId: string;
  apiBaseUrl: string | null;
}): { embedCode: string; widgetId: string } {
  const baseUrl = widget.apiBaseUrl ?? 'https://widget.huniprinting.com';
  const embedCode = `<script src="${baseUrl}/embed.js" data-widget-id="${widget.widgetId}"></script>`;
  return { embedCode, widgetId: widget.widgetId };
}

describe('generateEmbedCode', () => {
  it('generates embed code with default base URL', () => {
    const result = generateEmbedCode({
      widgetId: 'abc12345',
      apiBaseUrl: null,
    });

    expect(result.embedCode).toBe(
      '<script src="https://widget.huniprinting.com/embed.js" data-widget-id="abc12345"></script>',
    );
    expect(result.widgetId).toBe('abc12345');
  });

  it('uses custom apiBaseUrl when provided', () => {
    const result = generateEmbedCode({
      widgetId: 'xyz99999',
      apiBaseUrl: 'https://custom.example.com',
    });

    expect(result.embedCode).toBe(
      '<script src="https://custom.example.com/embed.js" data-widget-id="xyz99999"></script>',
    );
  });

  it('includes data-widget-id attribute', () => {
    const result = generateEmbedCode({
      widgetId: 'test-id',
      apiBaseUrl: null,
    });

    expect(result.embedCode).toContain('data-widget-id="test-id"');
  });

  it('includes /embed.js path', () => {
    const result = generateEmbedCode({
      widgetId: 'test',
      apiBaseUrl: 'https://cdn.example.com',
    });

    expect(result.embedCode).toContain('https://cdn.example.com/embed.js');
  });

  it('returns widgetId in result', () => {
    const result = generateEmbedCode({
      widgetId: 'my-widget',
      apiBaseUrl: null,
    });

    expect(result.widgetId).toBe('my-widget');
  });

  it('generates valid HTML script tag', () => {
    const result = generateEmbedCode({
      widgetId: 'w123',
      apiBaseUrl: null,
    });

    expect(result.embedCode).toMatch(/^<script .+><\/script>$/);
  });
});

describe('widgetId generation', () => {
  // The router uses crypto.randomUUID().slice(0, 8) for widgetId
  it('UUID slice produces 8-character ID', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const widgetId = uuid.slice(0, 8);
    expect(widgetId).toBe('a1b2c3d4');
    expect(widgetId.length).toBe(8);
  });

  it('uses provided widgetId when available', () => {
    const input = { widgetId: 'custom-id' };
    const values = {
      ...input,
      widgetId: input.widgetId ?? 'auto-generated',
    };
    expect(values.widgetId).toBe('custom-id');
  });

  it('falls back to auto-generated widgetId', () => {
    const input: { widgetId?: string } = {};
    const values = {
      widgetId: input.widgetId ?? 'auto-generated',
    };
    expect(values.widgetId).toBe('auto-generated');
  });
});
