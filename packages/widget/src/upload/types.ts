/**
 * File Upload Types
 *
 * Type definitions for design file upload and management.
 * Supports dual upload targets (Shopby Storage and S3) with validation.
 *
 * @see SPEC-SHOPBY-005 Section: File Upload Types
 * @MX:SPEC: SPEC-SHOPBY-005
 */

/**
 * File upload target destination
 */
export type UploadTarget = 'SHOPBY' | 'S3';

/**
 * Supported design file MIME types
 */
export const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/tiff': 'TIFF',
  'application/postscript': 'AI', // Adobe Illustrator
  'image/vnd.adobe.photoshop': 'PSD',
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<string, SupportedMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ai: 'application/postscript',
  psd: 'image/vnd.adobe.photoshop',
};

/**
 * Magic bytes signatures for file type validation
 */
export const MAGIC_BYTES: Record<SupportedMimeType, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]], // PNG
  'image/tiff': [
    [0x49, 0x49, 0x2a, 0x00], // TIFF (little-endian)
    [0x4d, 0x4d, 0x00, 0x2a], // TIFF (big-endian)
  ],
  'application/postscript': [[0x25, 0x21, 0x50, 0x53]], // %!PS (PostScript/AI)
  'image/vnd.adobe.photoshop': [[0x38, 0x42, 0x50, 0x53]], // 8BPS
};

/**
 * File validation result status
 */
export const FileValidationStatus = {
  VALID: 'VALID',
  WARNING: 'WARNING',
  INVALID: 'INVALID',
  SCANNING: 'SCANNING',
} as const;

export type FileValidationStatus =
  (typeof FileValidationStatus)[keyof typeof FileValidationStatus];

/**
 * Result of file validation
 */
export interface FileValidationResult {
  /** Validation status */
  status: FileValidationStatus;
  /** Detected MIME type (null if unknown) */
  mimeType: SupportedMimeType | null;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Human-readable file size */
  sizeFormatted: string;
  /** Whether file size is within limits */
  sizeValid: boolean;
  /** Image dimensions (for image files) */
  dimensions?: {
    width: number;
    height: number;
    dpi: number;
  };
  /** DPI validation result (for images) */
  dpiValid?: boolean;
  /** Validation warnings (non-blocking issues) */
  warnings: string[];
  /** Validation errors (blocking issues) */
  errors: string[];
}

/**
 * File upload progress information
 */
export interface FileUploadProgress {
  /** Unique upload ID */
  uploadId: string;
  /** File being uploaded */
  file: DesignFile;
  /** Upload target */
  target: UploadTarget;
  /** Bytes uploaded so far */
  uploadedBytes: number;
  /** Total bytes to upload */
  totalBytes: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current upload state */
  state: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  /** Upload speed in bytes per second */
  speed?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Error message (if failed) */
  error?: string;
  /** Result URL (if completed) */
  resultUrl?: string;
  /** Upload start timestamp */
  startedAt?: Date;
  /** Upload completion timestamp */
  completedAt?: Date;
}

/**
 * Design file metadata
 */
export interface DesignFile {
  /** Unique file ID */
  id: string;
  /** Original file name */
  originalName: string;
  /** Standardized file name */
  standardName?: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: SupportedMimeType;
  /** File extension (lowercase, no dot) */
  extension: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** Validation result */
  validation: FileValidationResult;
  /** Image dimensions (if applicable) */
  dimensions?: {
    width: number;
    height: number;
    dpi: number;
  };
  /** Upload progress (if uploading) */
  uploadProgress?: FileUploadProgress;
  /** Accessible URL (if uploaded) */
  url?: string;
  /** Upload target used */
  uploadTarget?: UploadTarget;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Print specification for file naming
 */
export interface PrintSpec {
  /** Product category (e.g., "명함", "전단지") */
  productType: string;
  /** Print size (e.g., "A4", "90x55mm") */
  size: string;
  /** Print sides (e.g., "단면", "양면") */
  sides: '단면' | '양면';
  /** Paper material (e.g., "스노우지", "마껍데기") */
  material: string;
  /** Print quantity */
  quantity: number;
}

/**
 * Customer information for file naming
 */
export interface CustomerInfo {
  /** Company/store name */
  companyName?: string;
  /** Customer name */
  customerName: string;
  /** File sequence number (for multiple files) */
  fileNumber?: number;
}

/**
 * File size limits
 */
export const FILE_SIZE_LIMITS = {
  /** Shopby Storage maximum file size (12MB) */
  SHOPBY_MAX_SIZE: 12 * 1024 * 1024,
  /** S3 maximum file size (500MB) */
  S3_MAX_SIZE: 500 * 1024 * 1024,
  /** Minimum DPI for print quality */
  MIN_PRINT_DPI: 300,
} as const;

/**
 * Upload error codes
 */
export const UploadErrorCode = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_MAGIC_BYTES: 'INVALID_MAGIC_BYTES',
  LOW_RESOLUTION: 'LOW_RESOLUTION',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SHOPBY_ERROR: 'SHOPBY_ERROR',
  S3_ERROR: 'S3_ERROR',
  CANCELLED: 'CANCELLED',
} as const;

export type UploadErrorCode =
  (typeof UploadErrorCode)[keyof typeof UploadErrorCode];

/**
 * Structured upload error
 */
export interface UploadError {
  /** Error code for programmatic handling */
  code: UploadErrorCode;
  /** Human-readable error message */
  message: string;
  /** Original error cause */
  cause?: unknown;
  /** Additional error details */
  details?: Record<string, unknown>;
}
