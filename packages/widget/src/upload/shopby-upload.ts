/**
 * Shopby Storage Upload Client
 *
 * Handles file uploads to Shopby Storage API.
 * Maximum file size: 12MB. For larger files, use S3.
 *
 * @see SPEC-SHOPBY-005 Section: Shopby Storage Upload
 * @MX:ANCHOR: Shopby API integration - primary upload target for files under 12MB
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type {
  UploadError,
  UploadErrorCode,
  FileUploadProgress,
  DesignFile,
} from './types';
import { UploadErrorCode as UploadErrorCodeEnum, FILE_SIZE_LIMITS } from './types';

/**
 * Shopby Storage API response for temporary image upload.
 */
interface ShopbyUploadResponse {
  /** Access URL for uploaded file */
  accessUrl: string;
  /** File path in storage */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
}

/**
 * Shopby API error response.
 */
interface ShopbyErrorResponse {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Upload progress callback type.
 */
export type ProgressCallback = (progress: FileUploadProgress) => void;

/**
 * Options for Shopby upload.
 */
export interface ShopbyUploadOptions {
  /** Shopby API base URL */
  baseUrl?: string;
  /** Partner ID for authentication */
  partnerId?: string;
  /** Access token for authenticated upload */
  accessToken?: string;
  /** Progress callback */
  onProgress?: ProgressCallback;
}

/**
 * Client for uploading files to Shopby Storage API.
 * Handles temporary image uploads for files under 12MB.
 */
export class ShopbyStorage {
  private baseUrl: string;
  private partnerId?: string;
  private accessToken?: string;

  /** Default Shopby Storage API base URL */
  private static readonly DEFAULT_BASE_URL =
    'https://api.shopby.co.kr/shop/v1';

  constructor(options: ShopbyUploadOptions = {}) {
    this.baseUrl = options.baseUrl ?? ShopbyStorage.DEFAULT_BASE_URL;
    this.partnerId = options.partnerId;
    this.accessToken = options.accessToken;
  }

  /**
   * Upload image to Shopby temporary storage.
   * Maximum file size: 12MB.
   *
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to access URL
   * @throws UploadError if upload fails
   */
  async uploadImage(
    file: File,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    // Validate file size (12MB limit for Shopby)
    if (file.size > FILE_SIZE_LIMITS.SHOPBY_MAX_SIZE) {
      throw this.createError(
        'FILE_TOO_LARGE',
        `File size exceeds Shopby limit of 12MB. Current size: ${this.formatSize(file.size)}`,
      );
    }

    // Generate upload ID for progress tracking
    const uploadId = `shopby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Initialize progress
    const designFile = this.fileToDesignFile(file, uploadId);
    onProgress?.({
      uploadId,
      file: designFile,
      target: 'SHOPBY',
      uploadedBytes: 0,
      totalBytes: file.size,
      percentage: 0,
      state: 'pending',
      startedAt: new Date(),
    });

    try {
      // Upload using fetch with progress tracking
      const result = await this.uploadWithProgress(
        file,
        uploadId,
        designFile,
        onProgress,
      );

      // Notify completion
      onProgress?.({
        uploadId,
        file: designFile,
        target: 'SHOPBY',
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: 100,
        state: 'completed',
        resultUrl: result.accessUrl,
        completedAt: new Date(),
      });

      return result.accessUrl;
    } catch (error) {
      // Notify failure
      onProgress?.({
        uploadId,
        file: designFile,
        target: 'SHOPBY',
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
   * Check if file size is within Shopby limits.
   */
  isWithinLimits(file: File): boolean {
    return file.size > 0 && file.size <= FILE_SIZE_LIMITS.SHOPBY_MAX_SIZE;
  }

  /**
   * Get maximum file size for Shopby uploads.
   */
  getMaxFileSize(): number {
    return FILE_SIZE_LIMITS.SHOPBY_MAX_SIZE;
  }

  /**
   * Set authentication credentials.
   */
  setAuth(partnerId: string, accessToken: string): void {
    this.partnerId = partnerId;
    this.accessToken = accessToken;
  }

  /**
   * Upload file with progress tracking.
   * Uses XMLHttpRequest for progress events (fetch doesn't support upload progress).
   */
  private uploadWithProgress(
    file: File,
    uploadId: string,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<ShopbyUploadResponse> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress?.({
            uploadId,
            file: designFile,
            target: 'SHOPBY',
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
          try {
            const response = JSON.parse(xhr.responseText) as ShopbyUploadResponse;
            resolve(response);
          } catch {
            reject(
              this.createError(
                'SHOPBY_ERROR',
                'Invalid response from Shopby API',
              ),
            );
          }
        } else {
          // Parse error response
          try {
            const errorResponse = JSON.parse(
              xhr.responseText,
            ) as ShopbyErrorResponse;
            reject(
              this.createError(
                'SHOPBY_ERROR',
                errorResponse.message || `Shopby API error: ${xhr.status}`,
                { code: errorResponse.code, details: errorResponse.details },
              ),
            );
          } catch {
            reject(
              this.createError(
                'SHOPBY_ERROR',
                `Shopby API error: ${xhr.status} ${xhr.statusText}`,
              ),
            );
          }
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(
          this.createError(
            'NETWORK_ERROR',
            'Network error: unable to reach Shopby API',
          ),
        );
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(this.createError('CANCELLED', 'Upload cancelled'));
      });

      // Open and send request
      xhr.open('POST', `${this.baseUrl}/storage/temporary-images`);

      // Set authentication headers if available
      if (this.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      }
      if (this.partnerId) {
        xhr.setRequestHeader('X-Partner-Id', this.partnerId);
      }

      xhr.send(formData);
    });
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
 * Default Shopby Storage client instance.
 */
export const shopbyStorage = new ShopbyStorage();
