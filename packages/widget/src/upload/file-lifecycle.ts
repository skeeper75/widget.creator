/**
 * File Lifecycle Manager
 *
 * Manages file status transitions throughout the order lifecycle.
 * Handles confirmation, archiving, orphaning, and replacement requests.
 *
 * @see SPEC-SHOPBY-005 Section: File Lifecycle Management
 * @MX:ANCHOR: File lifecycle state machine - manages file status transitions
 * @MX:REASON: Critical business logic for file state management
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type { UploadError } from './types';
import { UploadErrorCode } from './types';
import type { FileStatus } from './file-order-linker';

/**
 * File replacement request record.
 */
export interface FileReplacementRequest {
  /** Unique request ID */
  id: string;
  /** Original file ID being replaced */
  originalFileId: string;
  /** New file ID (after approval) */
  newFileId?: string;
  /** Request reason */
  reason: string;
  /** Request status */
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** Requester user ID */
  requestedBy: string;
  /** Admin approver user ID */
  approvedBy?: string;
  /** Admin rejection reason */
  rejectionReason?: string;
  /** Request creation timestamp */
  createdAt: Date;
  /** Approval/rejection timestamp */
  processedAt?: Date;
}

/**
 * File lifecycle event.
 */
export interface FileLifecycleEvent {
  /** Event type */
  type: 'CONFIRMED' | 'ARCHIVED' | 'ORPHANED' | 'REPLACEMENT_REQUESTED' | 'REPLACEMENT_APPROVED';
  /** File ID */
  fileId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/**
 * File lifecycle manager configuration options.
 */
export interface FileLifecycleManagerOptions {
  /** API endpoint for file lifecycle operations */
  apiEndpoint: string;
  /** Authentication token for API requests */
  authToken?: string;
  /** Default orphan expiry days */
  defaultOrphanExpiryDays?: number;
  /** Event callback */
  onEvent?: (event: FileLifecycleEvent) => void;
}

/**
 * API response wrapper.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Manages file lifecycle operations including confirmation,
 * archiving, orphaning, and replacement requests.
 */
export class FileLifecycleManager {
  private apiEndpoint: string;
  private authToken?: string;
  private defaultOrphanExpiryDays: number;
  private onEvent?: (event: FileLifecycleEvent) => void;

  /** Cache of replacement requests */
  private replacementRequests: Map<string, FileReplacementRequest> = new Map();

  constructor(options: FileLifecycleManagerOptions) {
    this.apiEndpoint = options.apiEndpoint;
    this.authToken = options.authToken;
    this.defaultOrphanExpiryDays = options.defaultOrphanExpiryDays ?? 30;
    this.onEvent = options.onEvent;
  }

  /**
   * Confirm a file after payment completion.
   * Transitions file status from ATTACHED to CONFIRMED.
   *
   * @param fileId - File ID to confirm
   * @returns Promise resolving to new file status
   * @throws UploadError if confirmation fails
   */
  async confirmFile(fileId: string): Promise<FileStatus> {
    const response = await this.fetchApi<ApiResponse<{ status: FileStatus }>>(
      `/files/${fileId}/confirm`,
      { method: 'POST' },
    );

    if (!response.success || !response.data) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to confirm file',
        { fileId },
      );
    }

    this.emitEvent({
      type: 'CONFIRMED',
      fileId,
      timestamp: new Date(),
    });

    return response.data.status;
  }

  /**
   * Archive a file for replacement.
   * Marks file as archived but keeps it accessible for reference.
   *
   * @param fileId - File ID to archive
   * @returns Promise resolving when archiving is complete
   * @throws UploadError if archiving fails
   */
  async archiveFile(fileId: string): Promise<void> {
    const response = await this.fetchApi<ApiResponse<void>>(
      `/files/${fileId}/archive`,
      { method: 'POST' },
    );

    if (!response.success) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to archive file',
        { fileId },
      );
    }

    this.emitEvent({
      type: 'ARCHIVED',
      fileId,
      timestamp: new Date(),
    });
  }

  /**
   * Mark file as orphaned with auto-delete schedule.
   * Orphaned files are scheduled for deletion after expiry days.
   *
   * @param fileId - File ID to orphan
   * @param expiryDays - Days until auto-delete (default from config)
   * @returns Promise resolving to deletion date
   * @throws UploadError if orphaning fails
   */
  async orphanFile(
    fileId: string,
    expiryDays?: number,
  ): Promise<Date> {
    const days = expiryDays ?? this.defaultOrphanExpiryDays;

    const response = await this.fetchApi<ApiResponse<{ deleteAt: string }>>(
      `/files/${fileId}/orphan`,
      {
        method: 'POST',
        body: JSON.stringify({ expiryDays: days }),
      },
    );

    if (!response.success || !response.data) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to orphan file',
        { fileId },
      );
    }

    const deleteAt = new Date(response.data.deleteAt);

    this.emitEvent({
      type: 'ORPHANED',
      fileId,
      timestamp: new Date(),
      data: { deleteAt: deleteAt.toISOString(), expiryDays: days },
    });

    return deleteAt;
  }

  /**
   * Request file replacement.
   * Creates a replacement request requiring admin approval.
   *
   * @param fileId - Original file ID to replace
   * @param reason - Reason for replacement request
   * @returns Promise resolving to replacement request
   * @throws UploadError if request creation fails
   */
  async requestReplacement(
    fileId: string,
    reason: string,
  ): Promise<FileReplacementRequest> {
    const response = await this.fetchApi<ApiResponse<FileReplacementRequest>>(
      '/files/replacement/request',
      {
        method: 'POST',
        body: JSON.stringify({
          originalFileId: fileId,
          reason,
        }),
      },
    );

    if (!response.success || !response.data) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to create replacement request',
        { fileId },
      );
    }

    // Cache request
    this.replacementRequests.set(response.data.id, response.data);

    this.emitEvent({
      type: 'REPLACEMENT_REQUESTED',
      fileId,
      timestamp: new Date(),
      data: { requestId: response.data.id, reason },
    });

    return response.data;
  }

  /**
   * Approve file replacement (admin only).
   * Links new file to original order, archives old file.
   *
   * @param fileId - Original file ID being replaced
   * @param newFileId - New file ID to use
   * @returns Promise resolving to updated replacement request
   * @throws UploadError if approval fails
   */
  async approveReplacement(
    fileId: string,
    newFileId: string,
  ): Promise<FileReplacementRequest> {
    // Find pending request for this file
    let request: FileReplacementRequest | undefined;
    for (const req of this.replacementRequests.values()) {
      if (req.originalFileId === fileId && req.status === 'PENDING') {
        request = req;
        break;
      }
    }

    if (!request) {
      throw this.createError(
        'UPLOAD_FAILED',
        'No pending replacement request found for file',
        { fileId },
      );
    }

    const response = await this.fetchApi<ApiResponse<FileReplacementRequest>>(
      '/files/replacement/approve',
      {
        method: 'POST',
        body: JSON.stringify({
          requestId: request.id,
          newFileId,
        }),
      },
    );

    if (!response.success || !response.data) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to approve replacement',
        { fileId, newFileId },
      );
    }

    // Update cache
    this.replacementRequests.set(request.id, response.data);

    this.emitEvent({
      type: 'REPLACEMENT_APPROVED',
      fileId,
      timestamp: new Date(),
      data: { newFileId, requestId: request.id },
    });

    return response.data;
  }

  /**
   * Reject file replacement request (admin only).
   *
   * @param requestId - Replacement request ID to reject
   * @param reason - Rejection reason
   * @returns Promise resolving when rejection is complete
   */
  async rejectReplacement(
    requestId: string,
    reason: string,
  ): Promise<void> {
    const response = await this.fetchApi<ApiResponse<void>>(
      '/files/replacement/reject',
      {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          rejectionReason: reason,
        }),
      },
    );

    if (!response.success) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Failed to reject replacement',
        { requestId },
      );
    }

    // Update cache
    const request = this.replacementRequests.get(requestId);
    if (request) {
      request.status = 'REJECTED';
      request.rejectionReason = reason;
      request.processedAt = new Date();
    }
  }

  /**
   * Get replacement request by ID.
   *
   * @param requestId - Request ID to fetch
   * @returns Promise resolving to replacement request
   */
  async getReplacementRequest(
    requestId: string,
  ): Promise<FileReplacementRequest> {
    // Check cache first
    const cached = this.replacementRequests.get(requestId);
    if (cached) {
      return cached;
    }

    const response = await this.fetchApi<ApiResponse<FileReplacementRequest>>(
      `/files/replacement/${requestId}`,
      { method: 'GET' },
    );

    if (!response.success || !response.data) {
      throw this.createError(
        'UPLOAD_FAILED',
        response.error ?? 'Replacement request not found',
        { requestId },
      );
    }

    this.replacementRequests.set(requestId, response.data);
    return response.data;
  }

  /**
   * Get all replacement requests for a file.
   *
   * @param fileId - File ID to query
   * @returns Promise resolving to array of replacement requests
   */
  async getFileReplacementRequests(
    fileId: string,
  ): Promise<FileReplacementRequest[]> {
    const response = await this.fetchApi<ApiResponse<{ requests: FileReplacementRequest[] }>>(
      `/files/${fileId}/replacements`,
      { method: 'GET' },
    );

    if (!response.success || !response.data) {
      return [];
    }

    // Update cache
    for (const req of response.data.requests) {
      this.replacementRequests.set(req.id, req);
    }

    return response.data.requests;
  }

  /**
   * Set authentication token.
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear local caches.
   */
  clearCache(): void {
    this.replacementRequests.clear();
  }

  /**
   * Emit lifecycle event.
   */
  private emitEvent(event: FileLifecycleEvent): void {
    this.onEvent?.(event);
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
 * Default file lifecycle manager instance (requires configuration).
 */
export const fileLifecycleManager = new FileLifecycleManager({
  apiEndpoint: '', // Must be configured before use
});
