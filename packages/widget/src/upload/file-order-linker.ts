/**
 * File-Order Linker
 *
 * Manages associations between uploaded design files and orders.
 * Handles file status transitions: PENDING -> ATTACHED -> CONFIRMED -> ORPHANED
 *
 * @see SPEC-SHOPBY-005 Section: File-Order Linking
 * @MX:ANCHOR: File-order association API - bridges file uploads to order system
 * @MX:REASON: Critical business logic for file lifecycle management
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type { UploadError } from './types';
import { UploadErrorCode } from './types';

/**
 * File status in the order lifecycle.
 */
export type FileStatus = 'PENDING' | 'ATTACHED' | 'CONFIRMED' | 'ORPHANED';

/**
 * File-order link record.
 */
export interface FileOrderLink {
  /** Unique link ID */
  id: string;
  /** File ID from upload system */
  fileId: string;
  /** Associated order ID */
  orderId: string;
  /** Order item ID (for multi-item orders) */
  orderItemId?: string;
  /** Current file status */
  status: FileStatus;
  /** Access URL for the file */
  fileUrl: string;
  /** Original file name */
  originalName: string;
  /** File size in bytes */
  fileSize: number;
  /** Link creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * API response for file-order link operations.
 */
export interface FileOrderLinkResponse {
  /** Success flag */
  success: boolean;
  /** Link record (if successful) */
  link?: FileOrderLink;
  /** Error message (if failed) */
  error?: string;
}

/**
 * File-Order linker configuration options.
 */
export interface FileOrderLinkerOptions {
  /** API endpoint for file-order operations */
  apiEndpoint: string;
  /** Authentication token for API requests */
  authToken?: string;
}

/**
 * Manages file-order associations with status transitions.
 */
export class FileOrderLinker {
  private apiEndpoint: string;
  private authToken?: string;

  /** Local cache of file-order links */
  private linkCache: Map<string, FileOrderLink> = new Map();

  constructor(options: FileOrderLinkerOptions) {
    this.apiEndpoint = options.apiEndpoint;
    this.authToken = options.authToken;
  }

  /**
   * Attach a file to an order.
   * Transitions file status from PENDING to ATTACHED.
   *
   * @param fileId - File ID from upload system
   * @param orderId - Order ID to attach to
   * @param orderItemId - Optional order item ID
   * @returns Promise resolving to file-order link
   * @throws UploadError if attachment fails
   */
  async attachFile(
    fileId: string,
    orderId: string,
    orderItemId?: string,
  ): Promise<FileOrderLink> {
    const response = await this.fetchApi<FileOrderLinkResponse>('/files/attach', {
      method: 'POST',
      body: JSON.stringify({
        fileId,
        orderId,
        orderItemId,
      }),
    });

    if (!response.success || !response.link) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to attach file to order',
        { fileId, orderId },
      );
    }

    // Update cache
    this.linkCache.set(response.link.id, response.link);

    return response.link;
  }

  /**
   * Detach a file from an order.
   * Transitions file status back to PENDING or to ORPHANED.
   *
   * @param fileId - File ID to detach
   * @returns Promise resolving when detachment is complete
   * @throws UploadError if detachment fails
   */
  async detachFile(fileId: string): Promise<void> {
    const response = await this.fetchApi<FileOrderLinkResponse>('/files/detach', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });

    if (!response.success) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to detach file from order',
        { fileId },
      );
    }

    // Remove from cache
    for (const [linkId, link] of this.linkCache.entries()) {
      if (link.fileId === fileId) {
        this.linkCache.delete(linkId);
        break;
      }
    }
  }

  /**
   * Get file access URL.
   * Returns the URL for accessing the file, checking status first.
   *
   * @param fileId - File ID to get URL for
   * @returns Promise resolving to file access URL
   * @throws UploadError if file not found or status invalid
   */
  async getFileUrl(fileId: string): Promise<string> {
    // Check cache first
    for (const link of this.linkCache.values()) {
      if (link.fileId === fileId) {
        if (link.status === 'ORPHANED') {
          throw this.createError(
            'UPLOAD_FAILED',
            'File is orphaned and no longer accessible',
            { fileId, status: link.status },
          );
        }
        return link.fileUrl;
      }
    }

    // Fetch from API
    const response = await this.fetchApi<{ url: string; status: FileStatus }>(
      `/files/${fileId}/url`,
      { method: 'GET' },
    );

    if (response.status === 'ORPHANED') {
      throw this.createError(
        'UPLOAD_FAILED',
        'File is orphaned and no longer accessible',
        { fileId, status: response.status },
      );
    }

    return response.url;
  }

  /**
   * Get all files attached to an order.
   *
   * @param orderId - Order ID to query
   * @returns Promise resolving to array of file-order links
   */
  async getOrderFiles(orderId: string): Promise<FileOrderLink[]> {
    const response = await this.fetchApi<{ files: FileOrderLink[] }>(
      `/orders/${orderId}/files`,
      { method: 'GET' },
    );

    // Update cache
    for (const link of response.files) {
      this.linkCache.set(link.id, link);
    }

    return response.files;
  }

  /**
   * Check file status.
   *
   * @param fileId - File ID to check
   * @returns Promise resolving to current file status
   */
  async getFileStatus(fileId: string): Promise<FileStatus> {
    const response = await this.fetchApi<{ status: FileStatus }>(
      `/files/${fileId}/status`,
      { method: 'GET' },
    );

    return response.status;
  }

  /**
   * Transition file to specific status.
   * Validates status transition rules.
   *
   * @param fileId - File ID to update
   * @param newStatus - Target status
   * @returns Promise resolving when transition is complete
   */
  async transitionStatus(
    fileId: string,
    newStatus: FileStatus,
  ): Promise<void> {
    // Validate transition
    const validTransitions: Record<FileStatus, FileStatus[]> = {
      PENDING: ['ATTACHED', 'ORPHANED'],
      ATTACHED: ['CONFIRMED', 'PENDING', 'ORPHANED'],
      CONFIRMED: ['ORPHANED'],
      ORPHANED: [], // Terminal state
    };

    const currentStatus = await this.getFileStatus(fileId);

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw this.createError(
        'UPLOAD_FAILED',
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        { fileId, currentStatus, newStatus },
      );
    }

    await this.fetchApi<void>(`/files/${fileId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    // Update cache
    for (const link of this.linkCache.values()) {
      if (link.fileId === fileId) {
        link.status = newStatus;
        link.updatedAt = new Date();
        break;
      }
    }
  }

  /**
   * Set authentication token.
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear local cache.
   */
  clearCache(): void {
    this.linkCache.clear();
  }

  /**
   * Fetch from API with authentication.
   */
  private async fetchApi<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.apiEndpoint}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw this.createError(
        'UPLOAD_FAILED',
        `API error: ${response.status} ${response.statusText}`,
        { status: response.status, body },
      );
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Create structured upload error.
   */
  private createError(
    code: UploadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): UploadError {
    return {
      code,
      message,
      details,
    };
  }
}

/**
 * Default file-order linker instance (requires configuration).
 */
export const fileOrderLinker = new FileOrderLinker({
  apiEndpoint: '', // Must be configured before use
});
