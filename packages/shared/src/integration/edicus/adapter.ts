/**
 * Edicus Integration Adapter
 *
 * Handles design editor configuration and rendering for Edicus.
 * Note: This adapter is on-demand (not event-driven).
 */

import type { DomainEvent, DomainEventType } from '../../events/types.js';
import type { IntegrationAdapter, AdapterStatus, CircuitBreakerState } from '../types.js';
import { CircuitBreaker, CIRCUIT_BREAKER_CONFIGS } from '../circuit-breaker.js';
import { retryWithBackoff, RETRY_CONFIGS } from '../retry.js';
import type {
  EdicusApiConfig,
  EditorConfig,
  EdicusRenderRequest,
  EdicusRenderJob,
  DesignSaveRequest,
  SavedDesign,
} from './types.js';
import { toEditorConfig, toRenderRequest } from './mapper.js';

/**
 * Database operations needed by Edicus adapter
 */
export interface EdicusDatabaseOps {
  getProduct(productId: number): Promise<{
    id: number;
    huniCode: string;
    name: string;
    editorEnabled: boolean;
  } | null>;
  getProductEditorMapping(productId: number): Promise<{
    templateId: string | null;
    templateConfig: Record<string, unknown> | null;
  } | null>;
  getProductSizeConstraints(productId: number): Promise<{
    cutWidth: number | null;
    cutHeight: number | null;
    workWidth: number | null;
    workHeight: number | null;
  } | null>;
  saveDesign(request: DesignSaveRequest): Promise<SavedDesign>;
  updateDesignRenderedUrl(designId: string, url: string): Promise<void>;
  getDesign(designId: string): Promise<SavedDesign | null>;
}

/**
 * HTTP client for Edicus API
 */
export interface EdicusHttpClient {
  getRenderJobStatus(jobId: string): Promise<EdicusRenderJob>;
  triggerRender(request: EdicusRenderRequest): Promise<EdicusRenderJob>;
  healthCheck(): Promise<boolean>;
}

/**
 * Edicus Adapter configuration
 */
export interface EdicusAdapterConfig {
  api: EdicusApiConfig;
  db: EdicusDatabaseOps;
  http: EdicusHttpClient;
  logger?: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };
}

/**
 * Edicus Integration Adapter
 *
 * This adapter is on-demand (not event-driven).
 * subscribedEvents is empty - operations are triggered via API calls.
 *
 * Uses CircuitBreaker (3 failures, 30s cooldown)
 */
export class EdicusAdapter implements IntegrationAdapter {
  readonly name = 'edicus';
  readonly subscribedEvents: ReadonlyArray<DomainEventType> = [];

  private readonly circuitBreaker: CircuitBreaker;
  private readonly config: EdicusAdapterConfig;
  private readonly logger: NonNullable<EdicusAdapterConfig['logger']>;

  // Status tracking
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;

  constructor(config: EdicusAdapterConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.edicus);
    this.logger = config.logger ?? {
      info: console.log,
      error: console.error,
      warn: console.warn,
    };
  }

  /**
   * Handle domain events (no-op for Edicus - on-demand only)
   */
  async handleEvent(_event: DomainEvent): Promise<void> {
    // Edicus adapter is on-demand, not event-driven
  }

  /**
   * Get editor configuration for a product
   *
   * @param productId - Product ID
   * @returns Editor configuration or null if product not found
   */
  async getEditorConfig(productId: number): Promise<EditorConfig | null> {
    const product = await this.config.db.getProduct(productId);
    if (!product || !product.editorEnabled) {
      return null;
    }

    const mapping = await this.config.db.getProductEditorMapping(productId);
    const sizeConstraints = await this.config.db.getProductSizeConstraints(productId);

    return toEditorConfig(
      { huniCode: product.huniCode },
      mapping ?? null,
      sizeConstraints ?? undefined
    );
  }

  /**
   * Save a design from the editor
   *
   * @param request - Design save request
   * @returns Saved design record
   */
  async saveDesign(request: DesignSaveRequest): Promise<SavedDesign> {
    return this.config.db.saveDesign(request);
  }

  /**
   * Get a saved design by ID
   *
   * @param designId - Design ID
   * @returns Saved design or null
   */
  async getDesign(designId: string): Promise<SavedDesign | null> {
    return this.config.db.getDesign(designId);
  }

  /**
   * Trigger print-ready render for a design
   *
   * @param designId - Design ID from Edicus
   * @param outputFormat - Output format (pdf or png)
   * @param quality - Quality level (print or preview)
   * @returns Render job
   */
  async triggerRender(
    designId: string,
    outputFormat: 'pdf' | 'png' = 'pdf',
    quality: 'print' | 'preview' = 'print'
  ): Promise<EdicusRenderJob> {
    const request = toRenderRequest(designId, outputFormat, quality);

    try {
      const job = await this.circuitBreaker.execute(() =>
        retryWithBackoff(
          () => this.config.http.triggerRender(request),
          RETRY_CONFIGS.designRender
        )
      );

      this.onSuccess();

      this.logger.info('Render job triggered', {
        designId,
        jobId: job.jobId,
        outputFormat,
        quality,
      });

      return job;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Get render job status
   *
   * @param jobId - Render job ID
   * @returns Render job status
   */
  async getRenderJobStatus(jobId: string): Promise<EdicusRenderJob> {
    return this.circuitBreaker.execute(() =>
      this.config.http.getRenderJobStatus(jobId)
    );
  }

  /**
   * Poll render job until completed or failed
   *
   * @param jobId - Render job ID
   * @param maxAttempts - Maximum poll attempts
   * @param intervalMs - Poll interval in milliseconds
   * @returns Final render job status
   */
  async pollRenderJob(
    jobId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<EdicusRenderJob> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const job = await this.getRenderJobStatus(jobId);

      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    // Return last known status if polling exhausted
    return this.getRenderJobStatus(jobId);
  }

  /**
   * Health check for Edicus API
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(() => this.config.http.healthCheck());
    } catch {
      return false;
    }
  }

  /**
   * Get adapter status
   */
  getStatus(): AdapterStatus {
    const cbStats = this.circuitBreaker.getStats();

    return {
      name: this.name,
      healthy: cbStats.state === 'CLOSED',
      circuitBreakerState: cbStats.state as CircuitBreakerState,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // Private helper methods

  private onSuccess(): void {
    this.lastSuccessAt = new Date();
    this.consecutiveFailures = 0;
  }

  private onFailure(error: unknown): void {
    this.lastFailureAt = new Date();
    this.consecutiveFailures++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error('Edicus adapter operation failed', {
      consecutiveFailures: this.consecutiveFailures,
      error: errorMessage,
    });
  }
}
