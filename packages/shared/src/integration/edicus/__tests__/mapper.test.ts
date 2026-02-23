/**
 * Unit tests for Edicus mapper functions
 *
 * Tests cover toEditorConfig, toRenderRequest,
 * toProductEditorList, and parseRenderJobResponse.
 */
import { describe, it, expect } from 'vitest';
import {
  toEditorConfig,
  toRenderRequest,
  toProductEditorList,
  parseRenderJobResponse,
} from '../mapper.js';
import { generateEdicusCode, extractHuniCode, EDICUS_CODE_PREFIX } from '../types.js';

describe('toEditorConfig', () => {
  it('should generate edicusCode as HU_ + huniCode', () => {
    const result = toEditorConfig(
      { huniCode: '12345' },
      null
    );

    expect(result.edicusCode).toBe('HU_12345');
  });

  it('should use templateId from editor mapping', () => {
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      { templateId: 'TPL-001', templateConfig: null }
    );

    expect(result.templateId).toBe('TPL-001');
  });

  it('should use templateConfig from editor mapping', () => {
    const templateConfig = { theme: 'dark', layout: 'grid' };
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      { templateId: 'TPL-001', templateConfig }
    );

    expect(result.templateConfig).toEqual(templateConfig);
  });

  it('should include size constraints from product sizes', () => {
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      null,
      { cutWidth: 90, cutHeight: 100, workWidth: 96, workHeight: 106 }
    );

    expect(result.sizeConstraints.width).toBe(90);
    expect(result.sizeConstraints.height).toBe(100);
  });

  it('should handle null mapping gracefully', () => {
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      null
    );

    expect(result.templateId).toBeNull();
    expect(result.templateConfig).toBeNull();
  });

  it('should handle undefined size constraints', () => {
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      null,
      undefined
    );

    expect(result.sizeConstraints.width).toBeUndefined();
    expect(result.sizeConstraints.height).toBeUndefined();
  });

  it('should handle null size values', () => {
    const result = toEditorConfig(
      { huniCode: 'HC001' },
      null,
      { cutWidth: null, cutHeight: null, workWidth: 96, workHeight: 106 }
    );

    expect(result.sizeConstraints.width).toBeUndefined();
    expect(result.sizeConstraints.height).toBeUndefined();
  });
});

describe('toRenderRequest', () => {
  it('should map designId correctly', () => {
    const result = toRenderRequest('DESIGN-001', 'pdf', 'print');
    expect(result.designId).toBe('DESIGN-001');
  });

  it('should map outputFormat correctly', () => {
    const result = toRenderRequest('DESIGN-001', 'png', 'preview');
    expect(result.outputFormat).toBe('png');
  });

  it('should map quality correctly', () => {
    const result = toRenderRequest('DESIGN-001', 'pdf', 'print');
    expect(result.quality).toBe('print');
  });

  it('should map preview quality', () => {
    const result = toRenderRequest('DESIGN-001', 'pdf', 'preview');
    expect(result.quality).toBe('preview');
  });
});

describe('generateEdicusCode', () => {
  it('should generate code with HU_ prefix', () => {
    expect(generateEdicusCode('12345')).toBe('HU_12345');
  });

  it('should handle alphanumeric huni codes', () => {
    expect(generateEdicusCode('ABC123')).toBe('HU_ABC123');
  });
});

describe('extractHuniCode', () => {
  it('should extract huni code from edicus code', () => {
    expect(extractHuniCode('HU_12345')).toBe('12345');
  });

  it('should return null for invalid prefix', () => {
    expect(extractHuniCode('XX_12345')).toBeNull();
  });
});

describe('EDICUS_CODE_PREFIX', () => {
  it('should be HU_', () => {
    expect(EDICUS_CODE_PREFIX).toBe('HU_');
  });
});

describe('toProductEditorList', () => {
  it('should filter to only editor-enabled products', () => {
    const products = [
      { productId: 1, huniCode: 'HC001', name: 'Product A', editorEnabled: true, templateId: 'TPL-001' },
      { productId: 2, huniCode: 'HC002', name: 'Product B', editorEnabled: false, templateId: null },
      { productId: 3, huniCode: 'HC003', name: 'Product C', editorEnabled: true, templateId: null },
    ];

    const result = toProductEditorList(products);

    expect(result).toHaveLength(2);
    expect(result[0].productId).toBe(1);
    expect(result[1].productId).toBe(3);
  });
});

describe('parseRenderJobResponse', () => {
  it('should parse completed response with camelCase keys', () => {
    const result = parseRenderJobResponse({
      designId: 'DESIGN-001',
      jobId: 'JOB-001',
      status: 'completed',
      resultUrl: 'https://cdn.example.com/result.pdf',
    });

    expect(result).not.toBeNull();
    expect(result!.designId).toBe('DESIGN-001');
    expect(result!.jobId).toBe('JOB-001');
    expect(result!.status).toBe('completed');
    expect(result!.resultUrl).toBe('https://cdn.example.com/result.pdf');
  });

  it('should parse failed response', () => {
    const result = parseRenderJobResponse({
      designId: 'DESIGN-001',
      jobId: 'JOB-001',
      status: 'failed',
      errorMessage: 'Render timeout',
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
    expect(result!.errorMessage).toBe('Render timeout');
  });

  it('should handle snake_case keys', () => {
    const result = parseRenderJobResponse({
      design_id: 'DESIGN-002',
      job_id: 'JOB-002',
      status: 'completed',
      result_url: 'https://cdn.example.com/result.png',
    });

    expect(result).not.toBeNull();
    expect(result!.designId).toBe('DESIGN-002');
    expect(result!.jobId).toBe('JOB-002');
  });

  it('should return null for missing designId', () => {
    const result = parseRenderJobResponse({
      jobId: 'JOB-001',
      status: 'completed',
    });

    expect(result).toBeNull();
  });

  it('should return null for invalid status', () => {
    const result = parseRenderJobResponse({
      designId: 'DESIGN-001',
      jobId: 'JOB-001',
      status: 'processing',
    });

    expect(result).toBeNull();
  });
});
