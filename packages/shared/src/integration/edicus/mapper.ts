/**
 * Edicus Data Mapper
 *
 * Transforms between Widget Builder domain types and Edicus API formats.
 */

import type {
  EditorConfig,
  EdicusRenderRequest,
  ProductWithEditorMapping,
  ProductSizeConstraints,
} from './types.js';
import { generateEdicusCode } from './types.js';

/**
 * Product data for editor config mapping
 */
export interface ProductForEditorConfig {
  huniCode: string;
}

/**
 * Editor mapping data
 */
export interface EditorMappingData {
  templateId: string | null;
  templateConfig: Record<string, unknown> | null;
}

/**
 * Transform product and mapping data to editor configuration
 *
 * CRITICAL: edicusCode is always 'HU_' + huniCode
 *
 * @param product - Product with huniCode
 * @param mapping - Editor mapping with template info (can be null)
 * @param sizeConstraints - Size constraints from product_sizes
 * @returns EditorConfig for Widget SDK
 */
export function toEditorConfig(
  product: ProductForEditorConfig,
  mapping: EditorMappingData | null,
  sizeConstraints?: ProductSizeConstraints
): EditorConfig {
  return {
    edicusCode: generateEdicusCode(product.huniCode),
    templateId: mapping?.templateId ?? null,
    templateConfig: mapping?.templateConfig ?? null,
    sizeConstraints: {
      width: sizeConstraints?.cutWidth ?? undefined,
      height: sizeConstraints?.cutHeight ?? undefined,
    },
  };
}

/**
 * Transform design data to render request
 *
 * @param designId - Edicus design ID
 * @param outputFormat - Output format (pdf or png)
 * @param quality - Quality level (print or preview)
 * @returns EdicusRenderRequest
 */
export function toRenderRequest(
  designId: string,
  outputFormat: 'pdf' | 'png',
  quality: 'print' | 'preview'
): EdicusRenderRequest {
  return {
    designId,
    outputFormat,
    quality,
  };
}

/**
 * Product data with editor mapping for listing
 */
export interface ProductEditorListItem {
  productId: number;
  huniCode: string;
  name: string;
  editorEnabled: boolean;
  templateId: string | null;
}

/**
 * Transform product with editor mapping for list view
 *
 * @param products - Products with editor mappings
 * @returns List of editor-enabled products
 */
export function toProductEditorList(
  products: Array<{
    productId: number;
    huniCode: string;
    name: string;
    editorEnabled: boolean;
    templateId: string | null;
  }>
): ProductEditorListItem[] {
  return products
    .filter((p) => p.editorEnabled)
    .map((p) => ({
      productId: p.productId,
      huniCode: p.huniCode,
      name: p.name,
      editorEnabled: p.editorEnabled,
      templateId: p.templateId,
    }));
}

/**
 * Design data for render result
 */
export interface DesignRenderResult {
  designId: string;
  jobId: string;
  status: 'completed' | 'failed';
  resultUrl?: string;
  errorMessage?: string;
}

/**
 * Parse render job response from Edicus
 *
 * @param response - Raw response from Edicus API
 * @returns Parsed render result
 */
export function parseRenderJobResponse(response: Record<string, unknown>): DesignRenderResult | null {
  const designId = response.designId ?? response.design_id;
  const jobId = response.jobId ?? response.job_id;
  const status = response.status;
  const resultUrl = response.resultUrl ?? response.result_url;
  const errorMessage = response.errorMessage ?? response.error_message ?? response.error;

  if (typeof designId !== 'string' || typeof jobId !== 'string') {
    return null;
  }

  if (status !== 'completed' && status !== 'failed') {
    return null;
  }

  return {
    designId,
    jobId,
    status,
    resultUrl: typeof resultUrl === 'string' ? resultUrl : undefined,
    errorMessage: typeof errorMessage === 'string' ? errorMessage : undefined,
  };
}
