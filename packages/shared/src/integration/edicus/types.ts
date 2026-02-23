/**
 * Edicus Integration Types
 *
 * Types for Edicus design editor integration.
 */

/**
 * Edicus API configuration
 */
export interface EdicusApiConfig {
  /** Base URL for Edicus API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
}

/**
 * Editor configuration for Widget SDK
 */
export interface EditorConfig {
  /** Edicus design code (HU_ + huniCode) */
  edicusCode: string;
  /** Template ID for the editor */
  templateId: string | null;
  /** Template configuration object */
  templateConfig: Record<string, unknown> | null;
  /** Size constraints for the editor canvas */
  sizeConstraints: {
    width?: number;
    height?: number;
  };
}

/**
 * Edicus render job configuration
 */
export interface EdicusRenderRequest {
  /** Design ID from Edicus */
  designId: string;
  /** Output format */
  outputFormat: 'pdf' | 'png';
  /** Quality level */
  quality: 'print' | 'preview';
}

/**
 * Edicus render job status
 */
export interface EdicusRenderJob {
  /** Job ID */
  jobId: string;
  /** Design ID */
  designId: string;
  /** Output format */
  outputFormat: 'pdf' | 'png';
  /** Quality level */
  quality: 'print' | 'preview';
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Result URL when completed */
  resultUrl?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Created timestamp */
  createdAt?: string;
  /** Completed timestamp */
  completedAt?: string;
}

/**
 * Product with editor mapping data
 */
export interface ProductWithEditorMapping {
  productId: number;
  huniCode: string;
  templateId: string | null;
  templateConfig: Record<string, unknown> | null;
}

/**
 * Size constraints from product_sizes table
 */
export interface ProductSizeConstraints {
  cutWidth: number | null;
  cutHeight: number | null;
  workWidth: number | null;
  workHeight: number | null;
}

/**
 * Design save request
 */
export interface DesignSaveRequest {
  productId: number;
  designData: Record<string, unknown>;
  editorSessionId: string;
  customerId?: string;
}

/**
 * Saved design record
 */
export interface SavedDesign {
  id: string;
  productId: number;
  designData: Record<string, unknown>;
  editorSessionId: string;
  customerId: string | null;
  renderedFileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Edicus code prefix constant
 * CRITICAL: Always 'HU_' + huniCode
 */
export const EDICUS_CODE_PREFIX = 'HU_';

/**
 * Generate edicusCode from huniCode
 */
export function generateEdicusCode(huniCode: string): string {
  return `${EDICUS_CODE_PREFIX}${huniCode}`;
}

/**
 * Extract huniCode from edicusCode
 */
export function extractHuniCode(edicusCode: string): string | null {
  if (edicusCode.startsWith(EDICUS_CODE_PREFIX)) {
    return edicusCode.slice(EDICUS_CODE_PREFIX.length);
  }
  return null;
}
