/**
 * Shopby MES Bridge
 *
 * Integrates widget orders with Manufacturing Execution System (MES)
 * for production job creation, status tracking, and callback handling.
 *
 * @see SPEC-SHOPBY-006 Section: MES Integration
 * @MX:SPEC: SPEC-SHOPBY-006
 */

import type { WidgetOptionInputs } from './types';

// =============================================================================
// SECTION 1: MES Types
// =============================================================================

/**
 * MES job status codes
 */
export const MesJobStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type MesJobStatus =
  (typeof MesJobStatus)[keyof typeof MesJobStatus];

/**
 * Request payload for creating a MES job
 */
export interface MesJobRequest {
  /** Unique identifier from the order system */
  orderId: string;
  /** Product identifier in MES */
  mesItemCode: string;
  /** Print specification JSON from widget */
  printSpec: string;
  /** URL to the design file for printing */
  designFileUrl: string;
  /** Order quantity */
  quantity: number;
  /** Optional special instructions */
  specialRequest?: string;
  /** Whether proof approval is required */
  proofRequired?: boolean;
  /** Customer information */
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  /** Priority level (1-10, higher = more urgent) */
  priority?: number;
  /** Requested delivery date (ISO 8601) */
  requestedDeliveryDate?: string;
}

/**
 * Response from MES job creation
 */
export interface MesJobResponse {
  /** Whether job creation succeeded */
  success: boolean;
  /** MES job identifier (if successful) */
  mesJobId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Estimated completion time (ISO 8601) */
  estimatedCompletion?: string;
  /** Queue position */
  queuePosition?: number;
}

/**
 * MES job status response
 */
export interface MesJobStatusResponse {
  /** MES job identifier */
  mesJobId: string;
  /** Current job status */
  status: MesJobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message or notes */
  message?: string;
  /** Production start time (ISO 8601) */
  startTime?: string;
  /** Production end time (ISO 8601) */
  endTime?: string;
  /** Tracking number (if shipped) */
  trackingNumber?: string;
  /** Courier company (if shipped) */
  courierCompany?: string;
  /** Estimated delivery date (ISO 8601) */
  estimatedDelivery?: string;
}

/**
 * Callback payload from MES system
 */
export interface MesJobCallback {
  /** MES job identifier */
  mesJobId: string;
  /** Order identifier for correlation */
  orderId: string;
  /** Callback type */
  type: MesCallbackType;
  /** New status */
  status: MesJobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Timestamp of callback (ISO 8601) */
  timestamp: string;
  /** Optional message */
  message?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Types of MES callbacks
 */
export const MesCallbackType = {
  JOB_CREATED: 'JOB_CREATED',
  JOB_STARTED: 'JOB_STARTED',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  SHIPPING_UPDATE: 'SHIPPING_UPDATE',
} as const;

export type MesCallbackType =
  (typeof MesCallbackType)[keyof typeof MesCallbackType];

/**
 * Handler function type for MES callbacks
 */
export type MesCallbackHandler = (callback: MesJobCallback) => Promise<void> | void;

// =============================================================================
// SECTION 2: MES Bridge Configuration
// =============================================================================

/**
 * Configuration for MES Bridge
 */
export interface MesBridgeConfig {
  /** MES API base URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Timeout for API requests in milliseconds */
  timeout?: number;
  /** Default priority for jobs */
  defaultPriority?: number;
}

// =============================================================================
// SECTION 3: MES Bridge Class
// =============================================================================

/**
 * Bridges widget orders to MES for production management.
 *
 * @MX:ANCHOR: MES integration - handles all communication with manufacturing system
 * @MX:REASON: Central integration point for production workflow
 */
export class MesBridge {
  private config: MesBridgeConfig;
  private callbackHandlers: Map<string, MesCallbackHandler[]> = new Map();

  constructor(config: MesBridgeConfig) {
    this.config = {
      timeout: 30000,
      defaultPriority: 5,
      ...config,
    };
  }

  /**
   * Create a new MES job from widget order data.
   *
   * @param orderId - Unique order identifier
   * @param printSpec - Print specification JSON string
   * @param designFileUrl - URL to the design file
   * @param options - Additional job options
   */
  async createMesJob(
    orderId: string,
    printSpec: string,
    designFileUrl: string,
    options?: {
      mesItemCode?: string;
      quantity?: number;
      optionInputs?: WidgetOptionInputs;
      customer?: MesJobRequest['customer'];
      priority?: number;
      requestedDeliveryDate?: string;
    },
  ): Promise<MesJobResponse> {
    const request: MesJobRequest = {
      orderId,
      mesItemCode: options?.mesItemCode ?? 'DEFAULT',
      printSpec,
      designFileUrl,
      quantity: options?.quantity ?? 1,
      specialRequest: options?.optionInputs?.specialRequest,
      proofRequired: options?.optionInputs?.proofRequired,
      customer: options?.customer,
      priority: options?.priority ?? this.config.defaultPriority,
      requestedDeliveryDate: options?.requestedDeliveryDate,
    };

    try {
      const response = await this.fetchWithTimeout(
        `${this.config.apiUrl}/jobs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(request),
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `MES API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as {
        jobId?: string;
        estimatedCompletion?: string;
        queuePosition?: number;
      };

      return {
        success: true,
        mesJobId: data.jobId,
        estimatedCompletion: data.estimatedCompletion,
        queuePosition: data.queuePosition,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current status of a MES job.
   *
   * @param mesJobId - MES job identifier
   */
  async getMesJobStatus(mesJobId: string): Promise<MesJobStatusResponse | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.apiUrl}/jobs/${mesJobId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`MES API error: ${response.status}`);
      }

      return (await response.json()) as MesJobStatusResponse;
    } catch (error) {
      console.error('Failed to get MES job status:', error);
      return null;
    }
  }

  /**
   * Handle incoming MES callback.
   * Dispatches to registered handlers by callback type.
   *
   * @param callback - Callback payload from MES
   */
  async handleMesCallback(callback: MesJobCallback): Promise<void> {
    const handlers = this.callbackHandlers.get(callback.type) ?? [];
    const allHandlers = this.callbackHandlers.get('*') ?? [];

    const allHandlersToCall = [...handlers, ...allHandlers];

    for (const handler of allHandlersToCall) {
      try {
        await handler(callback);
      } catch (error) {
        console.error('MES callback handler error:', error);
      }
    }
  }

  /**
   * Register a handler for MES callbacks.
   *
   * @param type - Callback type to handle (or '*' for all)
   * @param handler - Handler function
   */
  onCallback(type: MesCallbackType | '*', handler: MesCallbackHandler): void {
    const handlers = this.callbackHandlers.get(type) ?? [];
    handlers.push(handler);
    this.callbackHandlers.set(type, handlers);
  }

  /**
   * Remove a registered callback handler.
   *
   * @param type - Callback type
   * @param handler - Handler function to remove
   */
  offCallback(type: MesCallbackType | '*', handler: MesCallbackHandler): void {
    const handlers = this.callbackHandlers.get(type);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.callbackHandlers.set(type, handlers);
    }
  }

  /**
   * Cancel a MES job.
   *
   * @param mesJobId - MES job identifier
   */
  async cancelMesJob(mesJobId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.apiUrl}/jobs/${mesJobId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel MES job:', error);
      return false;
    }
  }

  /**
   * Update MES job priority.
   *
   * @param mesJobId - MES job identifier
   * @param priority - New priority (1-10)
   */
  async updatePriority(mesJobId: string, priority: number): Promise<boolean> {
    if (priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10');
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.config.apiUrl}/jobs/${mesJobId}/priority`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({ priority }),
        },
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to update MES job priority:', error);
      return false;
    }
  }

  /**
   * Fetch with timeout wrapper.
   * @MX:NOTE: Prevents hanging on slow MES API responses
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout,
    );

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// =============================================================================
// SECTION 4: Factory Function
// =============================================================================

/**
 * Create a MES Bridge instance with configuration.
 */
export function createMesBridge(config: MesBridgeConfig): MesBridge {
  return new MesBridge(config);
}

// =============================================================================
// SECTION 5: Utility Functions
// =============================================================================

/**
 * Check if MES job status is terminal (no further updates expected).
 */
export function isTerminalMesStatus(status: MesJobStatus): boolean {
  const terminalStatuses: MesJobStatus[] = [
    MesJobStatus.COMPLETED,
    MesJobStatus.FAILED,
    MesJobStatus.CANCELLED,
  ];
  return terminalStatuses.includes(status);
}

/**
 * Get human-readable label for MES job status.
 */
export function getMesStatusLabel(status: MesJobStatus): string {
  const labels: Record<MesJobStatus, string> = {
    [MesJobStatus.PENDING]: 'Pending',
    [MesJobStatus.QUEUED]: 'Queued',
    [MesJobStatus.PROCESSING]: 'Processing',
    [MesJobStatus.COMPLETED]: 'Completed',
    [MesJobStatus.FAILED]: 'Failed',
    [MesJobStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] ?? status;
}
