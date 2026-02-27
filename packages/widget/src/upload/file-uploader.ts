/**
 * File Uploader
 *
 * Main entry point for design file uploads.
 * Automatically routes uploads to Shopby (files < 12MB) or S3 (larger files).
 *
 * @see SPEC-SHOPBY-005 Section: File Upload Coordinator
 * @MX:ANCHOR: [AUTO] Primary upload API - orchestrates validation, routing, and upload
 * @MX:REASON: FileUploader.upload is the single public entry point for all design file uploads; routing logic (Shopby < 12MB, S3 >= 12MB) must not be bypassed
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import { FileValidator } from './file-validator';
import { ShopbyStorage, type ProgressCallback } from './shopby-upload';
import { S3DirectUpload } from './s3-direct-upload';
import { FileNamingService, generateStandardName } from './file-naming';
import type {
  DesignFile,
  FileUploadProgress,
  FileValidationResult,
  UploadTarget,
  PrintSpec,
  CustomerInfo,
  UploadError,
} from './types';
import { FILE_SIZE_LIMITS, UploadErrorCode } from './types';

/**
 * File uploader configuration options.
 */
export interface FileUploaderOptions {
  /** Custom Shopby API base URL */
  shopbyBaseUrl?: string;
  /** Shopby partner ID */
  shopbyPartnerId?: string;
  /** Shopby access token */
  shopbyAccessToken?: string;
  /** S3 upload endpoint (for large files) */
  s3Endpoint?: string;
  /** Minimum DPI for print quality */
  minDpi?: number;
  /** Enable automatic file renaming */
  autoRename?: boolean;
}

/**
 * Upload result after successful completion.
 */
export interface UploadResult {
  /** Uploaded file metadata */
  file: DesignFile;
  /** Access URL for the file */
  url: string;
  /** Upload target used */
  target: UploadTarget;
  /** Standard file name (if auto-rename enabled) */
  standardName?: string;
}

/**
 * Main file uploader class.
 * Coordinates validation, routing, naming, and upload operations.
 */
export class FileUploader {
  private validator: FileValidator;
  private shopbyStorage: ShopbyStorage;
  private s3Upload: S3DirectUpload | null;
  private namingService: FileNamingService;
  private autoRename: boolean;

  // @MX:WARN: [AUTO] Mutable shared upload registry - entries are deleted in finally blocks but not on AbortController cancel path
  // @MX:REASON: cancelUpload() deletes from activeUploads but uploadToShopby/uploadToS3 finally blocks also delete using designFile.id (not progress.uploadId), risking leaked entries if IDs differ
  /** Active upload progress trackers */
  private activeUploads: Map<string, FileUploadProgress> = new Map();

  constructor(options: FileUploaderOptions = {}) {
    this.validator = new FileValidator(options.minDpi);
    this.shopbyStorage = new ShopbyStorage({
      baseUrl: options.shopbyBaseUrl,
      partnerId: options.shopbyPartnerId,
      accessToken: options.shopbyAccessToken,
    });
    this.namingService = new FileNamingService();
    this.autoRename = options.autoRename ?? false;

    // Initialize S3 upload if endpoint is configured
    if (options.s3Endpoint) {
      this.s3Upload = new S3DirectUpload({
        apiEndpoint: options.s3Endpoint,
        authToken: options.shopbyAccessToken,
      });
    } else {
      this.s3Upload = null;
    }
  }

  /**
   * Upload a design file.
   * Automatically routes to Shopby (< 12MB) or S3 (>= 12MB).
   *
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to upload result
   * @throws UploadError if validation or upload fails
   */
  async upload(
    file: File,
    onProgress?: ProgressCallback,
  ): Promise<UploadResult> {
    // Step 1: Validate file
    const validation = await this.validator.validateFile(
      file,
      FILE_SIZE_LIMITS.S3_MAX_SIZE,
    );

    if (validation.status === 'INVALID') {
      throw this.createError(
        'INVALID_TYPE',
        `File validation failed: ${validation.errors.join(', ')}`,
        { validation },
      );
    }

    // Step 2: Determine upload target
    const target = this.determineUploadTarget(file.size);

    // Step 3: Create DesignFile object
    const designFile = this.createDesignFile(file, validation);

    // Step 4: Upload based on target
    let url: string;

    if (target === 'SHOPBY') {
      url = await this.uploadToShopby(file, designFile, onProgress);
    } else {
      url = await this.uploadToS3(file, designFile, onProgress);
    }

    // Step 5: Update file metadata
    designFile.url = url;
    designFile.uploadTarget = target;

    return {
      file: designFile,
      url,
      target,
    };
  }

  /**
   * Upload file with automatic renaming based on print spec.
   *
   * @param file - File to upload
   * @param spec - Print specification for naming
   * @param customer - Customer information for naming
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to upload result with standard name
   */
  async uploadWithNaming(
    file: File,
    spec: PrintSpec,
    customer: CustomerInfo,
    onProgress?: ProgressCallback,
  ): Promise<UploadResult> {
    // Generate standard name
    const extension = this.extractExtension(file.name);
    const standardName = this.namingService.generateStandardName(
      spec,
      customer,
      extension,
    );

    // Create renamed file
    const renamedFile = new File([file], `${standardName}`, {
      type: file.type,
      lastModified: file.lastModified,
    });

    // Upload with renamed file
    const result = await this.upload(renamedFile, onProgress);
    result.file.standardName = standardName;

    return {
      ...result,
      standardName,
    };
  }

  /**
   * Validate file without uploading.
   * Useful for client-side validation feedback.
   */
  async validate(file: File): Promise<FileValidationResult> {
    return this.validator.validateFile(file, FILE_SIZE_LIMITS.S3_MAX_SIZE);
  }

  /**
   * Get upload progress for active upload.
   */
  getProgress(uploadId: string): FileUploadProgress | undefined {
    return this.activeUploads.get(uploadId);
  }

  /**
   * Cancel active upload.
   */
  cancelUpload(uploadId: string): boolean {
    const progress = this.activeUploads.get(uploadId);
    if (progress && progress.state === 'uploading') {
      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }

  /**
   * Determine upload target based on file size.
   */
  private determineUploadTarget(size: number): UploadTarget {
    if (size <= FILE_SIZE_LIMITS.SHOPBY_MAX_SIZE) {
      return 'SHOPBY';
    }
    return 'S3';
  }

  /**
   * Upload to Shopby Storage.
   */
  private async uploadToShopby(
    file: File,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    // Wrap progress callback to track in activeUploads
    const wrappedProgress = (progress: FileUploadProgress) => {
      this.activeUploads.set(progress.uploadId, progress);
      onProgress?.(progress);
    };

    try {
      const url = await this.shopbyStorage.uploadImage(file, wrappedProgress);
      return url;
    } catch (error) {
      throw this.normalizeError(error);
    } finally {
      // Cleanup from active uploads
      this.activeUploads.delete(designFile.id);
    }
  }

  /**
   * Upload to S3 (for large files >= 5MB).
   * Uses S3DirectUpload for multipart uploads with progress tracking.
   */
  private async uploadToS3(
    file: File,
    designFile: DesignFile,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    if (!this.s3Upload) {
      throw this.createError(
        'S3_ERROR',
        'S3 upload endpoint not configured. Large files (>=5MB) require S3 endpoint.',
        { fileSize: file.size, maxSize: FILE_SIZE_LIMITS.S3_MAX_SIZE },
      );
    }

    // Wrap progress callback to track in activeUploads
    const wrappedProgress = (progress: FileUploadProgress) => {
      this.activeUploads.set(progress.uploadId, progress);
      onProgress?.(progress);
    };

    try {
      const url = await this.s3Upload.upload(file, wrappedProgress);
      return url;
    } catch (error) {
      throw this.normalizeError(error);
    } finally {
      // Cleanup from active uploads
      this.activeUploads.delete(designFile.id);
    }
  }

  /**
   * Create DesignFile from File and validation result.
   */
  private createDesignFile(
    file: File,
    validation: FileValidationResult,
  ): DesignFile {
    const uploadId = this.namingService.generateFileId();

    return {
      id: uploadId,
      originalName: file.name,
      size: file.size,
      mimeType: validation.mimeType ?? ('application/octet-stream' as DesignFile['mimeType']),
      extension: validation.extension,
      lastModified: new Date(file.lastModified),
      validation,
      dimensions: validation.dimensions,
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
   * Normalize various error types to UploadError.
   */
  private normalizeError(error: unknown): UploadError {
    if (this.isUploadError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return {
        code: 'UPLOAD_FAILED',
        message: error.message,
        cause: error,
      };
    }

    return {
      code: 'UPLOAD_FAILED',
      message: 'Unknown upload error',
      cause: error,
    };
  }

  /**
   * Type guard for UploadError.
   */
  private isUploadError(error: unknown): error is UploadError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error
    );
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
 * Default file uploader instance.
 */
export const fileUploader = new FileUploader();

// Re-export types and utilities for convenience
export type {
  DesignFile,
  FileUploadProgress,
  FileValidationResult,
  UploadTarget,
  PrintSpec,
  CustomerInfo,
  UploadError,
} from './types';
export { FileValidator } from './file-validator';
export { ShopbyStorage } from './shopby-upload';
export { S3DirectUpload } from './s3-direct-upload';
export { FileNamingService, generateStandardName } from './file-naming';
export { FILE_SIZE_LIMITS } from './types';
