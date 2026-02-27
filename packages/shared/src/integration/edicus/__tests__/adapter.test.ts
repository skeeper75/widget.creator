/**
 * Unit tests for EdicusAdapter
 *
 * Tests cover getEditorConfig, saveDesign, triggerRender,
 * and healthCheck with mocked database and HTTP client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EdicusAdapter } from '../adapter.js';
import type { EdicusAdapterConfig, EdicusDatabaseOps, EdicusHttpClient } from '../adapter.js';
import type { EdicusApiConfig, EdicusRenderJob, SavedDesign } from '../types.js';

function createMockConfig(): EdicusAdapterConfig {
  const api: EdicusApiConfig = { baseUrl: 'https://edicus.test' };
  const db: EdicusDatabaseOps = {
    getProduct: vi.fn(),
    getProductEditorMapping: vi.fn(),
    getProductSizeConstraints: vi.fn(),
    saveDesign: vi.fn(),
    updateDesignRenderedUrl: vi.fn(),
    getDesign: vi.fn(),
  };
  const http: EdicusHttpClient = {
    getRenderJobStatus: vi.fn(),
    triggerRender: vi.fn(),
    healthCheck: vi.fn(),
  };
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  return { api, db, http, logger };
}

describe('EdicusAdapter', () => {
  let adapter: EdicusAdapter;
  let config: EdicusAdapterConfig;

  beforeEach(() => {
    config = createMockConfig();
    adapter = new EdicusAdapter(config);
  });

  describe('metadata', () => {
    it('should have name "edicus"', () => {
      expect(adapter.name).toBe('edicus');
    });

    it('should have empty subscribedEvents (on-demand adapter)', () => {
      expect(adapter.subscribedEvents).toHaveLength(0);
    });
  });

  describe('getEditorConfig', () => {
    it('should return config with edicusCode for editor-enabled product', async () => {
      const db = config.db as { [K in keyof EdicusDatabaseOps]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        id: 1,
        huniCode: '12345',
        name: 'Test Product',
        editorEnabled: true,
      });
      db.getProductEditorMapping.mockResolvedValue({
        templateId: 'TPL-001',
        templateConfig: { theme: 'light' },
      });
      db.getProductSizeConstraints.mockResolvedValue({
        cutWidth: 90,
        cutHeight: 100,
        workWidth: 96,
        workHeight: 106,
      });

      const result = await adapter.getEditorConfig(1);

      expect(result).not.toBeNull();
      expect(result!.edicusCode).toBe('HU_12345');
      expect(result!.templateId).toBe('TPL-001');
      expect(result!.templateConfig).toEqual({ theme: 'light' });
      expect(result!.sizeConstraints.width).toBe(90);
      expect(result!.sizeConstraints.height).toBe(100);
    });

    it('should return null when product not found', async () => {
      const db = config.db as { [K in keyof EdicusDatabaseOps]: ReturnType<typeof vi.fn> };
      db.getProduct.mockResolvedValue(null);

      const result = await adapter.getEditorConfig(999);

      expect(result).toBeNull();
    });

    it('should return null when product editor is not enabled', async () => {
      const db = config.db as { [K in keyof EdicusDatabaseOps]: ReturnType<typeof vi.fn> };
      db.getProduct.mockResolvedValue({
        id: 1,
        huniCode: '12345',
        name: 'Test Product',
        editorEnabled: false,
      });

      const result = await adapter.getEditorConfig(1);

      expect(result).toBeNull();
    });

    it('should handle null mapping and size constraints', async () => {
      const db = config.db as { [K in keyof EdicusDatabaseOps]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        id: 1,
        huniCode: '12345',
        name: 'Test Product',
        editorEnabled: true,
      });
      db.getProductEditorMapping.mockResolvedValue(null);
      db.getProductSizeConstraints.mockResolvedValue(null);

      const result = await adapter.getEditorConfig(1);

      expect(result).not.toBeNull();
      expect(result!.edicusCode).toBe('HU_12345');
      expect(result!.templateId).toBeNull();
      expect(result!.templateConfig).toBeNull();
    });
  });

  describe('saveDesign', () => {
    it('should store design record and return saved design', async () => {
      const db = config.db as { [K in keyof EdicusDatabaseOps]: ReturnType<typeof vi.fn> };

      const savedDesign: SavedDesign = {
        id: 'design-001',
        productId: 1,
        designData: { layers: [] },
        editorSessionId: 'session-123',
        customerId: 'cust-001',
        renderedFileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      db.saveDesign.mockResolvedValue(savedDesign);

      const result = await adapter.saveDesign({
        productId: 1,
        designData: { layers: [] },
        editorSessionId: 'session-123',
        customerId: 'cust-001',
      });

      expect(result.id).toBe('design-001');
      expect(result.productId).toBe(1);
      expect(db.saveDesign).toHaveBeenCalledWith({
        productId: 1,
        designData: { layers: [] },
        editorSessionId: 'session-123',
        customerId: 'cust-001',
      });
    });
  });

  describe('triggerRender', () => {
    it('should call Edicus Render API and return render job', async () => {
      const http = config.http as { [K in keyof EdicusHttpClient]: ReturnType<typeof vi.fn> };

      const renderJob: EdicusRenderJob = {
        jobId: 'JOB-001',
        designId: 'DESIGN-001',
        outputFormat: 'pdf',
        quality: 'print',
        status: 'pending',
      };
      http.triggerRender.mockResolvedValue(renderJob);

      const result = await adapter.triggerRender('DESIGN-001', 'pdf', 'print');

      expect(result.jobId).toBe('JOB-001');
      expect(http.triggerRender).toHaveBeenCalledWith({
        designId: 'DESIGN-001',
        outputFormat: 'pdf',
        quality: 'print',
      });
    });

    it('should use default output format and quality', async () => {
      const http = config.http as { [K in keyof EdicusHttpClient]: ReturnType<typeof vi.fn> };

      const renderJob: EdicusRenderJob = {
        jobId: 'JOB-002',
        designId: 'DESIGN-002',
        outputFormat: 'pdf',
        quality: 'print',
        status: 'pending',
      };
      http.triggerRender.mockResolvedValue(renderJob);

      await adapter.triggerRender('DESIGN-002');

      expect(http.triggerRender).toHaveBeenCalledWith({
        designId: 'DESIGN-002',
        outputFormat: 'pdf',
        quality: 'print',
      });
    });

    it('should throw when render API fails after retries', async () => {
      vi.useFakeTimers();
      try {
        const http = config.http as { [K in keyof EdicusHttpClient]: ReturnType<typeof vi.fn> };
        http.triggerRender.mockRejectedValue(new Error('render service unavailable'));

        const promise = adapter.triggerRender('DESIGN-001');
        const caughtPromise = promise.catch((e: unknown) => e);

        // Advance through all retry delays (designRender: 5 retries, 2s base)
        for (let i = 0; i < 10; i++) {
          await vi.advanceTimersByTimeAsync(60000);
        }

        const error = await caughtPromise;
        expect(error).toBeInstanceOf(Error);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('healthCheck', () => {
    it('should return true when Edicus API responds', async () => {
      const http = config.http as { [K in keyof EdicusHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockResolvedValue(true);

      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when Edicus API fails', async () => {
      const http = config.http as { [K in keyof EdicusHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockRejectedValue(new Error('timeout'));

      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return healthy status initially', () => {
      const status = adapter.getStatus();

      expect(status.name).toBe('edicus');
      expect(status.healthy).toBe(true);
      expect(status.circuitBreakerState).toBe('CLOSED');
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('handleEvent', () => {
    it('should be a no-op (on-demand adapter)', async () => {
      // Should not throw
      await adapter.handleEvent({
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: {
          id: 'test',
          timestamp: new Date(),
          correlationId: 'test',
          source: 'test',
        },
      });
    });
  });
});
