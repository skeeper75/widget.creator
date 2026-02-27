/**
 * S3 Direct Upload Client
 *
 * Handles file uploads directly to S3 using presigned URLs.
 * Supports multipart uploads for files >= 5MB with retry logic.
 *
 * @see SPEC-SHOPBY-005 Section: S3 Direct Upload
 * @MX:ANCHOR: Large file upload handler - supports files up to 500MB with multipart
 * @MX:REASON: External S3 integration point, high fan_in expected
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type {
  UploadError,
  UploadErrorCode,
  FileUploadProgress,
  DesignFile,
} from './types';
import { FILE_SIZE_LIMITS } from './types';

/**
 * Presigned URL response from backend API.
 */
export interface PresignedUrlResponse {
  /** Presigned URL for direct S3 upload */
  uploadUrl: string;
  /** Final access URL after upload */
  accessUrl: string;
  /** S3 object key */
  objectKey: string;
  /** Upload ID for multipart tracking */
  uploadId?: string;
  /** Expiration time in seconds */
  expiresIn: number;
}

/**
 * Multipart upload part response.
 */
export interface MultipartPartResponse {
  /** Part number (1-10000) */
  partNumber: number;
  /** Presigned URL for this part */
  uploadUrl: string;
  /** ETag after successful part upload */
  eTag?: string;
}

/**
 * Multipart upload completion response.
 */
export interface MultipartCompleteResponse {
  /** Final access URL */
  accessUrl: string;
  /** S3 object key */
  objectKey: string;
}

/**
 * Upload progress callback type.
 */
export type ProgressCallback = (progress: FileUploadProgress) => void;

/**
 * S3 direct upload configuration options.
 */
export interface S3DirectUploadOptions {
  /** API endpoint for requesting presigned URLs */
  apiEndpoint: string;
  /** Authentication token for API requests */
  authToken?: string;
  /** Chunk size for multipart uploads (default: 5MB) */
  chunkSize?: number;
  /** Maximum retry attempts for failed chunks */
  maxRetries?: number;
  /** Retry delay in ms (doubles on each retry) */
  retryDelayMs?: number;
  /** Progress callback */
  onProgress?: ProgressCallback;
}

/**
 * Multipart upload state.
 */
interface MultipartUploadState {
  uploadId: string;
  objectKey: string;
  parts: Array<{ partNumber: number; eTag: string }>;
  totalParts: number;
  uploadedParts: number;
}

/**
 * Default chunk size for multipart uploads (5MB).
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of parts in a multipart upload (S3 limit).
 */
const MAX_PARTS = 10000;

/**
 * Maximum retry attempts for failed chunks.
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * Base retry delay in milliseconds.
 */
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Client for direct S3 uploads using presigned URLs.
 * Handles both simple and multipart uploads with progress tracking.
 */
export class S3DirectUpload {
  private apiEndpoint: string;
  private authToken?: string;
  private chunkSize: number;
  private maxRetries: number;
  private retryDelayMs: number;

  /** Active multipart upload states */
  private activeMultipartUploads: Map<string, MultipartUploadState> = new Map();

  constructor(options: S3DirectUploadOptions) {
    this.apiEndpoint = options.apiEndpoint;
    this.authToken = options.authToken;
    this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  /**
   * Upload file to S3 using presigned URL.
   * Automatically selects simple or multipart upload based on file size.
   *
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to access URL
   * @throws UploadError if upload fails
   */
  async upload(
    file: File,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    // Validate file size
    if (file.size > FILE_SIZE_LIMITS.S3_MAX_SIZE) {
      throw this.createError(
        'FILE_TOO_LARGE',
        `File size exceeds S3 limit of 500MB. Current size: ${this.formatSize(file.size)}`,
        { fileSize: file.size, maxSize: FILE_SIZE_LIMITS.S3_MAX_SIZE },
      );
    }

    // Generate upload ID for progress tracking
    const uploadId = `s3_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const designFile = this.fileToDesignFile(file, uploadId);

    // Notify start
    onProgress?.({
      uploadId,
      file: designFile,
      target: 'S3',
      uploadedBytes: 0,
      totalBytes: file.size,
      percentage: 0,
      state: 'pending',
      startedAt: new Date(),
    });

    try {
      // Select upload method based on file size
      const useMultipart = file.size >= DEFAULT_CHUNK_SIZE;

      let accessUrl: string;

      if (useMultipart) {
        accessUrl = await this.uploadMultipart(file, uploadId, designFile, onProgress);
      } else {
        accessUrl = await this.uploadSimple(file, uploadId, designFile, onProgress);
      }

      // Notify completion
      onProgress?.({
        uploadId,
        file: designFile,
        target: 'S3',
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: 100,
        state: 'completed',
        resultUrl: accessUrl,
        completedAt: new Date(),
      });

      return accessUrl;
    } catch (error) {
      // Notify failure
      onProgress?.({
        uploadId,
        file: designFile,
        target: 'S3',
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        state: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      });

      throw error;
    }
  }

  /**
   * Request presigned URL from backend API.
   *
   * @param fileName - Original file name
   * @param fileSize - File size in bytes
   * @param mimeType - File MIME type
   * @returns Promise resolving to presigned URL response
   */
  async getPresignedUrl(
    fileName: string,
    fileSize: number,
    mimeType: string,
  ): Promise<PresignedUrlResponse> {
    const response = await fetch(`${this.apiEndpoint}/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({
        fileName,
        fileSize,
        mimeType,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw this.createError(
        'S3_ERROR',
        `Failed to get presigned URL: ${response.status} ${response.statusText}`,
        { status: response.status, body },
      );
    }

    return response.json();
  }

  /**
   * Simple upload for files < 5MB.
   * Uses single presigned URL PUT request.
   */
  private async uploadSimple(
    file: File,
    uploadId: string,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    // Request presigned URL
    const presigned = await this.getPresignedUrl(file.name, file.size, file.type);

    // Upload to S3 with progress tracking
    await this.uploadToS3WithProgress(
      file,
      presigned.uploadUrl,
      uploadId,
      designFile,
      onProgress,
    );

    return presigned.accessUrl;
  }

  /**
   * Multipart upload for files >= 5MB.
   * Splits file into chunks and uploads sequentially with retry logic.
   */
  private async uploadMultipart(
    file: File,
    uploadId: string,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    // Calculate number of parts
    const totalParts = Math.ceil(file.size / this.chunkSize);

    if (totalParts > MAX_PARTS) {
      throw this.createError(
        'FILE_TOO_LARGE',
        `File requires too many parts (${totalParts}). Maximum: ${MAX_PARTS}`,
        { totalParts, maxParts: MAX_PARTS },
      );
    }

    // Request multipart upload initiation
    const initiateResponse = await fetch(`${this.apiEndpoint}/multipart/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalParts,
      }),
    });

    if (!initiateResponse.ok) {
      throw this.createError('S3_ERROR', 'Failed to initiate multipart upload');
    }

    const { uploadId: s3UploadId, objectKey, parts } = await initiateResponse.json();

    // Initialize multipart state
    const state: MultipartUploadState = {
      uploadId: s3UploadId,
      objectKey,
      parts: [],
      totalParts,
      uploadedParts: 0,
    };
    this.activeMultipartUploads.set(uploadId, state);

    // Upload each part with retry logic
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * this.chunkSize;
      const end = Math.min(partNumber * this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      const partUrl = parts[partNumber - 1]?.uploadUrl;
      if (!partUrl) {
        throw this.createError('S3_ERROR', `Missing presigned URL for part ${partNumber}`);
      }

      // Upload part with retry
      const eTag = await this.uploadPartWithRetry(
        chunk,
        partUrl,
        partNumber,
        uploadId,
        designFile,
        state,
        onProgress,
      );

      state.parts.push({ partNumber, eTag });
      state.uploadedParts++;
    }

    // Complete multipart upload
    const completeResponse = await fetch(`${this.apiEndpoint}/multipart/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({
        uploadId: s3UploadId,
        objectKey,
        parts: state.parts,
      }),
    });

    if (!completeResponse.ok) {
      throw this.createError('S3_ERROR', 'Failed to complete multipart upload');
    }

    const result: MultipartCompleteResponse = await completeResponse.json();

    // Cleanup multipart state
    this.activeMultipartUploads.delete(uploadId);

    return result.accessUrl;
  }

  /**
   * Upload a single part with retry logic.
   */
  private async uploadPartWithRetry(
    chunk: Blob,
    partUrl: string,
    partNumber: number,
    uploadId: string,
    designFile: DesignFile,
    state: MultipartUploadState,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(partUrl, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        if (!response.ok) {
          throw this.createError(
            'S3_ERROR',
            `Part ${partNumber} upload failed: ${response.status}`,
          );
        }

        // Extract ETag from response
        const eTag = response.headers.get('ETag')?.replace(/"/g, '');
        if (!eTag) {
          throw this.createError('S3_ERROR', `Missing ETag for part ${partNumber}`);
        }

        // Update progress
        this.updateMultipartProgress(uploadId, designFile, state, onProgress);

        return eTag;
      } catch (error) {
        lastError = error;

        // Retry on network errors
        if (this.isNetworkError(error) && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Upload to S3 URL with progress tracking using XMLHttpRequest.
   */
  private async uploadToS3WithProgress(
    file: File | Blob,
    uploadUrl: string,
    uploadId: string,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress?.({
            uploadId,
            file: designFile,
            target: 'S3',
            uploadedBytes: event.loaded,
            totalBytes: event.total,
            percentage,
            state: 'uploading',
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            this.createError(
              'S3_ERROR',
              `S3 upload failed: ${xhr.status} ${xhr.statusText}`,
            ),
          );
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(this.createError('NETWORK_ERROR', 'Network error during S3 upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(this.createError('CANCELLED', 'Upload cancelled'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(file);
    });
  }

  /**
   * Update progress for multipart upload.
   */
  private updateMultipartProgress(
    uploadId: string,
    designFile: DesignFile,
    state: MultipartUploadState,
    onProgress?: ProgressCallback,
  ): void {
    const uploadedBytes = state.uploadedParts * this.chunkSize;
    const percentage = Math.round((uploadedBytes / designFile.size) * 100);

    onProgress?.({
      uploadId,
      file: designFile,
      target: 'S3',
      uploadedBytes,
      totalBytes: designFile.size,
      percentage,
      state: 'uploading',
    });
  }

  /**
   * Check if file size requires multipart upload.
   */
  requiresMultipart(fileSize: number): boolean {
    return fileSize >= DEFAULT_CHUNK_SIZE;
  }

  /**
   * Get maximum file size for S3 uploads.
   */
  getMaxFileSize(): number {
    return FILE_SIZE_LIMITS.S3_MAX_SIZE;
  }

  /**
   * Set authentication token.
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Convert File to DesignFile interface.
   */
  private fileToDesignFile(file: File, uploadId: string): DesignFile {
    return {
      id: uploadId,
      originalName: file.name,
      size: file.size,
      mimeType: file.type as DesignFile['mimeType'],
      extension: this.extractExtension(file.name),
      lastModified: new Date(file.lastModified),
      validation: {
        status: 'VALID',
        mimeType: file.type as DesignFile['mimeType'],
        extension: this.extractExtension(file.name),
        size: file.size,
        sizeFormatted: this.formatSize(file.size),
        sizeValid: true,
        warnings: [],
        errors: [],
      },
      createdAt: new Date(),
    };
  }

  /**
   * Extract file extension.
   */
  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return '';
    }
    return filename.slice(lastDot + 1).toLowerCase();
  }

  /**
   * Format file size.
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Check if error is a network-level error.
   */
  private isNetworkError(err: unknown): boolean {
    return err instanceof TypeError && 'message' in err;
  }

  /**
   * Delay helper for retry logic.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Default S3 direct upload instance (requires configuration).
 */
export const s3DirectUpload = new S3DirectUpload({
  apiEndpoint: '', // Must be configured before use
});
