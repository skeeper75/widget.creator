/**
 * File Validator
 *
 * Validates design files for type, size, and resolution.
 * Uses magic bytes for MIME type detection (prevents spoofing).
 *
 * @see SPEC-SHOPBY-005 Section: File Validation
 * @MX:ANCHOR: Core file validation - called by FileUploader for every upload
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type {
  SupportedMimeType,
  FileValidationResult,
  FileValidationStatus,
} from './types';
import {
  MAGIC_BYTES,
  EXTENSION_TO_MIME,
  SUPPORTED_MIME_TYPES,
  FILE_SIZE_LIMITS,
} from './types';

/**
 * Validates design files for upload compatibility.
 * Provides MIME type detection, size validation, and resolution checking.
 */
export class FileValidator {
  private minDpi: number;

  constructor(minDpi: number = FILE_SIZE_LIMITS.MIN_PRINT_DPI) {
    this.minDpi = minDpi;
  }

  /**
   * Validate file MIME type using magic bytes.
   * More reliable than file extension or browser-reported type.
   *
   * @param file - File to validate
   * @returns Promise resolving to detected MIME type or null
   */
  async validateMimeType(file: File): Promise<SupportedMimeType | null> {
    // Read first 16 bytes for magic number detection
    const buffer = await this.readFileHeader(file, 16);
    const bytes = new Uint8Array(buffer);

    // Check against known magic byte signatures
    for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const signature of signatures) {
        if (this.matchesSignature(bytes, signature)) {
          return mimeType as SupportedMimeType;
        }
      }
    }

    return null;
  }

  /**
   * Validate file size against maximum limit.
   *
   * @param file - File to validate
   * @param maxSize - Maximum allowed size in bytes
   * @returns Whether file size is within limits
   */
  validateSize(file: File, maxSize: number): boolean {
    return file.size > 0 && file.size <= maxSize;
  }

  /**
   * Validate image resolution (DPI).
   * Only applicable to image files (JPEG, PNG, TIFF).
   *
   * @param file - Image file to validate
   * @returns Promise resolving to dimensions and DPI info
   */
  async validateResolution(
    file: File,
  ): Promise<{ width: number; height: number; dpi: number } | null> {
    // Only validate resolution for image types
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Get display dimensions
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // Extract DPI from image metadata if available
        // Note: Browser Image API doesn't expose DPI directly
        // We assume 72 DPI for web images, actual print DPI should be checked server-side
        // For accurate DPI detection, use server-side processing or EXIF parsing
        const dpi = this.extractDpiFromImage(img) ?? 72;

        resolve({ width, height, dpi });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }

  /**
   * Perform comprehensive file validation.
   * Checks MIME type, size, and resolution (for images).
   *
   * @param file - File to validate
   * @param maxSize - Maximum allowed size in bytes (default: S3 max)
   * @returns Promise resolving to validation result
   */
  async validateFile(
    file: File,
    maxSize: number = FILE_SIZE_LIMITS.S3_MAX_SIZE,
  ): Promise<FileValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Extract file extension
    const extension = this.extractExtension(file.name);

    // Validate MIME type using magic bytes
    const detectedMimeType = await this.validateMimeType(file);
    const browserMimeType = file.type as SupportedMimeType;

    // Cross-check: magic bytes vs browser-reported type
    let finalMimeType: SupportedMimeType | null = detectedMimeType;

    if (detectedMimeType === null) {
      // Fallback to extension-based detection
      finalMimeType = EXTENSION_TO_MIME[extension] ?? null;

      if (finalMimeType === null) {
        errors.push(
          `Unsupported file type. Supported formats: ${Object.values(SUPPORTED_MIME_TYPES).join(', ')}`,
        );
      } else {
        warnings.push(
          'Could not verify file type from content. Using extension-based detection.',
        );
      }
    } else if (
      browserMimeType &&
      browserMimeType !== detectedMimeType &&
      browserMimeType in SUPPORTED_MIME_TYPES
    ) {
      warnings.push(
        `File type mismatch: extension indicates ${browserMimeType}, content indicates ${detectedMimeType}`,
      );
    }

    // Validate file size
    const sizeValid = this.validateSize(file, maxSize);
    if (!sizeValid) {
      if (file.size === 0) {
        errors.push('File is empty');
      } else {
        errors.push(
          `File size (${this.formatSize(file.size)}) exceeds maximum allowed (${this.formatSize(maxSize)})`,
        );
      }
    }

    // Validate resolution for image files
    let dimensions: { width: number; height: number; dpi: number } | undefined;
    let dpiValid: boolean | undefined;

    if (finalMimeType && this.isImageType(finalMimeType)) {
      const resolution = await this.validateResolution(file);
      if (resolution) {
        dimensions = resolution;
        dpiValid = resolution.dpi >= this.minDpi;

        if (!dpiValid) {
          warnings.push(
            `Image resolution (${resolution.dpi} DPI) is below recommended minimum (${this.minDpi} DPI) for print quality`,
          );
        }
      }
    }

    // Determine overall status
    let status: FileValidationStatus;
    if (errors.length > 0) {
      status = 'INVALID';
    } else if (warnings.length > 0) {
      status = 'WARNING';
    } else {
      status = 'VALID';
    }

    return {
      status,
      mimeType: finalMimeType,
      extension,
      size: file.size,
      sizeFormatted: this.formatSize(file.size),
      sizeValid,
      dimensions,
      dpiValid,
      warnings,
      errors,
    };
  }

  /**
   * Check if file is an image type.
   */
  private isImageType(mimeType: SupportedMimeType): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Extract file extension from filename.
   */
  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return '';
    }
    return filename.slice(lastDot + 1).toLowerCase();
  }

  /**
   * Read first N bytes of file for magic number detection.
   */
  private readFileHeader(file: File, bytes: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(0, bytes));
    });
  }

  /**
   * Check if file bytes match a magic number signature.
   */
  private matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
    if (bytes.length < signature.length) {
      return false;
    }
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Extract DPI from image if available in metadata.
   * Note: Browser API limitation - returns null for most images.
   */
  private extractDpiFromImage(img: HTMLImageElement): number | null {
    // Browser Image API doesn't expose DPI directly
    // In production, this should use EXIF parsing or server-side processing
    // For now, return null to indicate unknown DPI
    return null;
  }

  /**
   * Format file size in human-readable format.
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
}
