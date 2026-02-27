/**
 * Shopby Product Registration Service
 *
 * Orchestrates the full product registration pipeline:
 * validate -> map category -> generate options -> calculate prices -> build mallProduct -> register
 *
 * Supports single and batch registration with rate limiting and retry.
 *
 * Reference: SPEC-SHOPBY-002, R-PRD-001 through R-PRD-006
 *
 * @MX:ANCHOR: [AUTO] Primary orchestrator for Shopby product registration pipeline
 * @MX:REASON: Coordinates admin-client, option-generator, price-mapper, category-service
 * @MX:SPEC: SPEC-SHOPBY-002
 */

import type {
  ShopbyMallProduct,
  ShopbyProductOptionData,
  ProductRegistrationRequest,
  ProductRegistrationResult,
  BatchRegistrationResult,
  OptionMatrix,
} from './types.js';
import type { ShopbyAdminClient } from './admin-client.js';
import type { CategoryService } from './category-service.js';
import type { HuniProductData, WidgetConfigData } from './mapper.js';
import { toMallProduct, buildWidgetOptionMapping } from './mapper.js';
import { buildOptionMatrix, createPriceLookup } from './option-generator.js';
import { buildPriceMap, roundKrwPrice } from './price-mapper.js';

// =============================================================================
// SECTION 1: Configuration & Types
// =============================================================================

/** Default delay between batch registrations (ms) */
const DEFAULT_BATCH_DELAY_MS = 200;

/** Maximum retry attempts per product registration */
const MAX_RETRIES = 3;

/** Delay between retries (ms) */
const RETRY_DELAY_MS = 1000;

/**
 * Logger interface for registration service
 */
interface RegistrationServiceLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Batch registration options
 */
export interface BatchRegistrationOptions {
  /** Delay between registrations in ms (default: 200) */
  delayMs?: number;
  /** Maximum retries per product (default: 3) */
  maxRetries?: number;
  /** Whether to continue on individual failures (default: true) */
  continueOnError?: boolean;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, result: ProductRegistrationResult) => void;
}

// =============================================================================
// SECTION 2: Product Registration Service
// =============================================================================

/**
 * Shopby Product Registration Service
 *
 * @MX:ANCHOR: [AUTO] Orchestrates the complete product registration lifecycle
 * @MX:REASON: Single entry point for product registration, option setup, and price configuration
 */
export class ProductRegistrationService {
  private readonly client: ShopbyAdminClient;
  private readonly categoryService: CategoryService;
  private readonly logger: RegistrationServiceLogger;

  constructor(
    client: ShopbyAdminClient,
    categoryService: CategoryService,
    logger?: RegistrationServiceLogger
  ) {
    this.client = client;
    this.categoryService = categoryService;
    this.logger = logger ?? {
      info: console.log,
      warn: console.warn,
      error: console.error,
    };
  }

  // ============ Single Product Registration ============

  /**
   * Register a single product in Shopby
   *
   * Pipeline: validate -> map category -> generate options -> calculate prices -> build mallProduct -> register
   *
   * @param request - Product registration request
   * @returns Registration result with Shopby product number
   */
  async registerProduct(
    request: ProductRegistrationRequest
  ): Promise<ProductRegistrationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validate request
      this.validateRequest(request);

      // Step 2: Map category
      const categoryNo = this.categoryService.getCategoryNo(request.productType);
      if (categoryNo === undefined) {
        return this.failureResult(request, `No category mapping for product type: ${request.productType}`);
      }

      // Step 3: Generate option matrix
      const priceLookup = createPriceLookup(request.prices);
      const quantityTiers = request.quantities.map(q => ({
        ...q,
        addPrice: 0, // Actual addPrice calculated per-combination in option matrix
      }));
      const optionMatrix = buildOptionMatrix({
        sizes: request.sizes,
        papers: request.papers,
        quantities: quantityTiers,
        priceLookup,
        printModes: request.printModes,
        postProcesses: request.postProcesses,
      });

      // Step 4: Build price map and validate
      const priceMap = buildPriceMap(request.prices);
      const salePrice = roundKrwPrice(priceMap.salePrice);

      this.logger.info('Option matrix generated', {
        huniCode: request.huniCode,
        totalCombinations: optionMatrix.totalCombinationCount,
        registeredCombinations: optionMatrix.registeredCombinationCount,
        isRepresentativeSubset: optionMatrix.isRepresentativeSubset,
        salePrice,
      });

      // Step 5: Build mallProduct
      const mallProduct = this.buildMallProduct(request, categoryNo, salePrice);

      // Step 6: Register product via admin client
      const createResult = await this.client.createProduct(mallProduct);
      const mallProductNo = createResult.mallProductNo;

      this.logger.info('Product created in Shopby', {
        huniCode: request.huniCode,
        mallProductNo,
      });

      // Step 7: Set product options
      const optionData = this.buildOptionData(optionMatrix);
      await this.client.updateProductOptions(mallProductNo, optionData);

      this.logger.info('Product options configured', {
        huniCode: request.huniCode,
        mallProductNo,
        combinations: optionMatrix.registeredCombinationCount,
        required: optionMatrix.required.length,
        standard: optionMatrix.standard.length,
        elapsed: Date.now() - startTime,
      });

      return {
        huniProductId: request.huniProductId,
        huniCode: request.huniCode,
        shopbyProductNo: mallProductNo,
        success: true,
        optionCounts: {
          combinations: optionMatrix.registeredCombinationCount,
          required: optionMatrix.required.length,
          standard: optionMatrix.standard.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Product registration failed', {
        huniCode: request.huniCode,
        error: message,
        elapsed: Date.now() - startTime,
      });

      return this.failureResult(request, message);
    }
  }

  // ============ Batch Registration ============

  /**
   * Register multiple products in batch
   *
   * Processes products sequentially with configurable delay and retry.
   * Continues on individual failures by default.
   *
   * @param requests - Array of product registration requests
   * @param options - Batch processing options
   * @returns Batch result with per-product details
   */
  async batchRegister(
    requests: ProductRegistrationRequest[],
    options?: BatchRegistrationOptions
  ): Promise<BatchRegistrationResult> {
    const {
      delayMs = DEFAULT_BATCH_DELAY_MS,
      maxRetries = MAX_RETRIES,
      continueOnError = true,
      onProgress,
    } = options ?? {};

    const startedAt = new Date().toISOString();
    const results: ProductRegistrationResult[] = [];
    let succeeded = 0;
    let failed = 0;

    this.logger.info('Starting batch registration', {
      total: requests.length,
      delayMs,
      maxRetries,
    });

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      let result: ProductRegistrationResult | undefined;

      // Retry loop for individual product
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        result = await this.registerProduct(request);

        if (result.success) {
          break;
        }

        if (attempt < maxRetries) {
          this.logger.warn('Retrying product registration', {
            huniCode: request.huniCode,
            attempt,
            maxRetries,
            error: result.error,
          });
          await this.sleep(RETRY_DELAY_MS * attempt);
        }
      }

      // result is always defined after the loop
      const finalResult = result!;
      results.push(finalResult);

      if (finalResult.success) {
        succeeded++;
      } else {
        failed++;
        if (!continueOnError) {
          this.logger.error('Batch registration stopped due to error', {
            huniCode: request.huniCode,
            error: finalResult.error,
            completed: i + 1,
            total: requests.length,
          });
          break;
        }
      }

      onProgress?.(i + 1, requests.length, finalResult);

      // Rate limiting delay between registrations
      if (i < requests.length - 1) {
        await this.sleep(delayMs);
      }
    }

    const completedAt = new Date().toISOString();

    this.logger.info('Batch registration completed', {
      total: requests.length,
      succeeded,
      failed,
      startedAt,
      completedAt,
    });

    return {
      total: requests.length,
      succeeded,
      failed,
      results,
      startedAt,
      completedAt,
    };
  }

  // ============ Internal Helpers ============

  /**
   * Validate registration request
   *
   * @throws Error if request is invalid
   */
  private validateRequest(request: ProductRegistrationRequest): void {
    if (!request.huniCode) {
      throw new Error('huniCode is required');
    }
    if (!request.productName) {
      throw new Error('productName is required');
    }
    if (!request.productType) {
      throw new Error('productType is required');
    }
    if (request.sizes.length === 0) {
      throw new Error('At least one size option is required');
    }
    if (request.papers.length === 0) {
      throw new Error('At least one paper option is required');
    }
    if (request.quantities.length === 0) {
      throw new Error('At least one quantity tier is required');
    }
    if (request.prices.length === 0) {
      throw new Error('At least one price entry is required');
    }
  }

  /**
   * Build complete mallProduct for Shopby API
   */
  private buildMallProduct(
    request: ProductRegistrationRequest,
    categoryNo: number,
    salePrice: number
  ): ShopbyMallProduct {
    // Build widget option mappings from request data
    const options = this.buildWidgetOptionMappings(request);

    // Build HuniProductData for toMallProduct
    const huniProduct: HuniProductData = {
      id: request.huniProductId,
      huniCode: request.huniCode,
      name: request.productName,
      description: request.description,
      categoryId: request.categoryId,
      productType: request.productType,
      pricingModel: request.pricingModel,
      sheetStandard: request.sheetStandard,
      orderMethod: request.orderMethod,
      editorEnabled: request.editorEnabled,
      isActive: request.isActive,
      minSellingPrice: salePrice,
      deliveryTemplateNo: request.deliveryTemplateNo,
    };

    // Build widget config for extraJson
    const widgetConfig: WidgetConfigData = {
      options,
      pricing: {
        source: 'widget',
        model: request.pricingModel,
        currency: 'KRW',
        vatIncluded: true,
      },
      features: this.resolveFeatures(request),
    };

    // Build mall product using existing mapper
    return toMallProduct(
      huniProduct,
      categoryNo,
      widgetConfig,
      {
        itemCode: request.mesItemCode,
        hasOptions: true,
      }
    );
  }

  /**
   * Build widget option mappings from registration request
   */
  private buildWidgetOptionMappings(
    request: ProductRegistrationRequest
  ): WidgetConfigData['options'] {
    const mappings: WidgetConfigData['options'] = [
      buildWidgetOptionMapping('size', 'select', true, 'COMBINATION_1'),
      buildWidgetOptionMapping('paper', 'select', true, 'COMBINATION_2'),
      buildWidgetOptionMapping('quantity', 'select', true, 'COMBINATION_3'),
    ];

    if (request.printModes && request.printModes.length > 0) {
      mappings.push(buildWidgetOptionMapping('printType', 'select', true, 'REQUIRED'));
    }

    if (request.postProcesses && request.postProcesses.length > 0) {
      mappings.push(buildWidgetOptionMapping('finishing', 'multiselect', false, 'STANDARD'));
    }

    return mappings;
  }

  /**
   * Build Shopby option data from option matrix
   */
  private buildOptionData(optionMatrix: OptionMatrix): ShopbyProductOptionData {
    return {
      combinations: optionMatrix.combinations,
      required: optionMatrix.required,
      standard: optionMatrix.standard,
    };
  }

  /**
   * Resolve enabled features from request
   */
  private resolveFeatures(request: ProductRegistrationRequest): string[] {
    const features: string[] = ['pricing'];

    if (request.editorEnabled) {
      features.push('editor');
    }

    if (request.orderMethod === 'upload') {
      features.push('upload');
    }

    if (request.postProcesses && request.postProcesses.length > 0) {
      features.push('finishing');
    }

    return features;
  }

  /**
   * Create a failure result
   */
  private failureResult(
    request: ProductRegistrationRequest,
    error: string
  ): ProductRegistrationResult {
    return {
      huniProductId: request.huniProductId,
      huniCode: request.huniCode,
      success: false,
      error,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
