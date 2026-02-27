/**
 * File Naming Utility
 *
 * Generates standardized file names for design files.
 * Format: {품목}_{사이즈}_{양단면}_{소재}_{거래처}_{고객명}_{파일번호}_{수량}.{확장자}
 *
 * @see SPEC-SHOPBY-005 Section: File Naming Convention
 * @MX:NOTE: Korean NFC normalization ensures consistent file name encoding across systems
 * @MX:SPEC: SPEC-SHOPBY-005
 */

import type { PrintSpec, CustomerInfo } from './types';

/**
 * Generates standardized file names for design uploads.
 * Ensures consistent naming across different systems and platforms.
 */
export class FileNamingService {
  /**
   * Generate a standardized file name from print spec and customer info.
   *
   * @param spec - Print specification details
   * @param customer - Customer information
   * @param extension - File extension (without dot)
   * @returns Standardized file name
   *
   * @example
   * const name = generateStandardName(
   *   { productType: '명함', size: '90x55mm', sides: '양면', material: '스노우지', quantity: 1000 },
   *   { companyName: '인노지니', customerName: '홍길동', fileNumber: 1 },
   *   'pdf'
   * );
   * // Result: "명함_90x55mm_양면_스노우지_인노지니_홍길동_1_1000.pdf"
   */
  generateStandardName(
    spec: PrintSpec,
    customer: CustomerInfo,
    extension: string,
  ): string {
    const parts = [
      this.normalizeKorean(spec.productType),
      this.normalizeKorean(spec.size),
      this.normalizeKorean(spec.sides),
      this.normalizeKorean(spec.material),
      customer.companyName ? this.normalizeKorean(customer.companyName) : '',
      this.normalizeKorean(customer.customerName),
      String(customer.fileNumber ?? 1),
      `${spec.quantity}`,
    ].filter(Boolean);

    const baseName = parts.join('_');
    const sanitized = this.sanitizeFileName(baseName);
    const safeExtension = this.sanitizeExtension(extension);

    return `${sanitized}.${safeExtension}`;
  }

  /**
   * Generate a unique file ID.
   * Uses timestamp and random suffix for uniqueness.
   *
   * @returns Unique file identifier
   */
  generateFileId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `file_${timestamp}_${random}`;
  }

  /**
   * Normalize Korean text to NFC form.
   * Ensures consistent encoding across different systems.
   *
   * @param text - Korean text to normalize
   * @returns NFC-normalized text
   */
  private normalizeKorean(text: string): string {
    // NFC normalization composes Hangul jamo into precomposed syllables
    // This ensures consistent string comparison and sorting
    return text.normalize('NFC');
  }

  /**
   * Sanitize file name by removing/replacing unsafe characters.
   *
   * @param name - File name to sanitize
   * @returns Sanitized file name
   */
  private sanitizeFileName(name: string): string {
    return (
      name
        // Replace spaces with underscores
        .replace(/\s+/g, '_')
        // Remove or replace characters unsafe for file systems
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        // Replace multiple consecutive underscores with single
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_|_$/g, '')
        // Limit length to 200 characters (safe for most file systems)
        .slice(0, 200)
    );
  }

  /**
   * Sanitize file extension.
   *
   * @param extension - File extension to sanitize
   * @returns Sanitized extension (lowercase, no dots)
   */
  private sanitizeExtension(extension: string): string {
    return extension
      .toLowerCase()
      .replace(/^\./, '') // Remove leading dot
      .replace(/[^a-z0-9]/g, '') // Keep only alphanumeric
      .slice(0, 10); // Limit length
  }

  /**
   * Parse standardized file name back to components.
   * Useful for displaying file metadata or validation.
   *
   * @param filename - Standardized file name to parse
   * @returns Parsed components or null if invalid format
   */
  parseStandardName(
    filename: string,
  ): {
    productType: string;
    size: string;
    sides: string;
    material: string;
    companyName: string;
    customerName: string;
    fileNumber: number;
    quantity: number;
    extension: string;
  } | null {
    // Extract extension
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return null;
    }

    const extension = filename.slice(lastDot + 1).toLowerCase();
    const basename = filename.slice(0, lastDot);
    const parts = basename.split('_');

    // Expected format: 품목_사이즈_양단면_소재_거래처_고객명_파일번호_수량
    // Parts: 8 (without company) or 8 (with empty company)
    if (parts.length < 7 || parts.length > 8) {
      return null;
    }

    try {
      const productType = parts[0];
      const size = parts[1];
      const sides = parts[2];
      const material = parts[3];

      // If 7 parts, no company name
      // If 8 parts, company name is at index 4
      let companyName = '';
      let customerName: string;
      let fileNumber: number;
      let quantity: number;

      if (parts.length === 7) {
        customerName = parts[4];
        fileNumber = parseInt(parts[5], 10);
        quantity = parseInt(parts[6], 10);
      } else {
        companyName = parts[4];
        customerName = parts[5];
        fileNumber = parseInt(parts[6], 10);
        quantity = parseInt(parts[7], 10);
      }

      // Validate parsed numbers
      if (isNaN(fileNumber) || isNaN(quantity)) {
        return null;
      }

      return {
        productType,
        size,
        sides,
        material,
        companyName,
        customerName,
        fileNumber,
        quantity,
        extension,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Default file naming service instance.
 */
export const fileNamingService = new FileNamingService();

/**
 * Convenience function to generate standard file name.
 */
export function generateStandardName(
  spec: PrintSpec,
  customer: CustomerInfo,
  extension: string,
): string {
  return fileNamingService.generateStandardName(spec, customer, extension);
}
