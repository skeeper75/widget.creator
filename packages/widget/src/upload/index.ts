/**
 * File Upload Module
 *
 * Design file upload and management for print workflow.
 * Supports dual upload targets (Shopby Storage and S3) with validation.
 *
 * @see SPEC-SHOPBY-005
 * @MX:SPEC: SPEC-SHOPBY-005
 */

// Core types
export type {
  DesignFile,
  FileUploadProgress,
  FileValidationResult,
  FileValidationStatus,
  UploadTarget,
  PrintSpec,
  CustomerInfo,
  UploadError,
  UploadErrorCode,
  SupportedMimeType,
} from './types';

export {
  SUPPORTED_MIME_TYPES,
  EXTENSION_TO_MIME,
  MAGIC_BYTES,
  FILE_SIZE_LIMITS,
  // Note: FileValidationStatus and UploadErrorCode are type exports above
  // Only export values here
} from './types';

// Main uploader
export {
  FileUploader,
  fileUploader,
  type FileUploaderOptions,
  type UploadResult,
} from './file-uploader';

// Validator
export { FileValidator } from './file-validator';

// Shopby Storage client
export {
  ShopbyStorage,
  shopbyStorage,
  type ProgressCallback,
  type ShopbyUploadOptions,
} from './shopby-upload';

// File naming
export {
  FileNamingService,
  fileNamingService,
  generateStandardName,
} from './file-naming';

// S3 Direct Upload
export {
  S3DirectUpload,
  s3DirectUpload,
  type S3DirectUploadOptions,
  type PresignedUrlResponse,
  type MultipartPartResponse,
  type MultipartCompleteResponse,
} from './s3-direct-upload';

// File-Order Linker
export {
  FileOrderLinker,
  fileOrderLinker,
  type FileStatus,
  type FileOrderLink,
  type FileOrderLinkResponse,
  type FileOrderLinkerOptions,
} from './file-order-linker';

// File Lifecycle Manager
export {
  FileLifecycleManager,
  fileLifecycleManager,
  type FileReplacementRequest,
  type FileLifecycleEvent,
  type FileLifecycleManagerOptions,
} from './file-lifecycle';
