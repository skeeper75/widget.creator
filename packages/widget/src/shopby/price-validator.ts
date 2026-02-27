/**
 * Shopby Price Validator
 *
 * Validates price consistency between widget calculations and Shopby API.
 * Implements 3-tier validation strategy with PROCEED, WARN, and BLOCK actions.
 *
 * @see SPEC-SHOPBY-004 Section: Price Validation
 * @MX:ANCHOR: Price validation logic - ensures order integrity before payment
 * @MX:NOTE: 3-tier tolerance: PROCEED (<=100), WARN (100-1000), BLOCK (>1000)
 * @MX:SPEC: SPEC-SHOPBY-004
 */

/**
 * Price validation action types.
 * - PROCEED: Price difference within rounding tolerance
 * - WARN: Price difference requires admin notification
 * - BLOCK: Price difference exceeds safe threshold, order blocked
 */
export const PriceValidationAction = {
  PROCEED: 'PROCEED',
  WARN: 'WARN',
  BLOCK: 'BLOCK',
} as const;

export type PriceValidationAction =
  (typeof PriceValidationAction)[keyof typeof PriceValidationAction];

/**
 * Result of price validation between widget and Shopby.
 */
export interface PriceValidationResult {
  /** Whether the price difference is acceptable for order to proceed */
  isValid: boolean;
  /** Absolute price difference in KRW */
  difference: number;
  /** Recommended action based on difference magnitude */
  action: PriceValidationAction;
  /** Human-readable message describing the validation result */
  message: string;
  /** Widget-calculated total price */
  widgetTotalPrice: number;
  /** Shopby-calculated total price */
  shopbyTotalPrice: number;
  /** Timestamp of validation */
  timestamp: string;
}

/**
 * Configuration for price validation thresholds.
 */
export interface PriceValidationConfig {
  /** Maximum difference (in KRW) to allow PROCEED action. Default: 100 */
  proceedThreshold: number;
  /** Maximum difference (in KRW) to allow WARN action. Default: 1000 */
  warnThreshold: number;
  /** Whether to log warnings to console. Default: true */
  enableLogging: boolean;
}

/** Default validation configuration */
const DEFAULT_CONFIG: PriceValidationConfig = {
  proceedThreshold: 100,
  warnThreshold: 1000,
  enableLogging: true,
};

/**
 * Validates price consistency between widget and Shopby calculations.
 *
 * Implements a 3-tier validation strategy:
 * - PROCEED: difference <= 100 KRW (rounding tolerance)
 * - WARN: 100 < difference <= 1000 KRW (admin notification required)
 * - BLOCK: difference > 1000 KRW (order blocked, manual review needed)
 *
 * @example
 * ```typescript
 * const validator = new PriceValidator();
 * const result = validator.validate(50000, 50100);
 *
 * if (result.action === PriceValidationAction.BLOCK) {
 *   // Block order creation
 * } else if (result.action === PriceValidationAction.WARN) {
 *   // Proceed but notify admin
 * }
 * ```
 */
export class PriceValidator {
  private config: PriceValidationConfig;

  constructor(config?: Partial<PriceValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate price difference between widget and Shopby.
   * @MX:ANCHOR: Core validation entry point - called before order creation
   * @param widgetPrice - Total price calculated by widget (in KRW)
   * @param shopbyPrice - Total price returned by Shopby API (in KRW)
   * @returns PriceValidationResult with action recommendation
   */
  validate(widgetPrice: number, shopbyPrice: number): PriceValidationResult {
    const difference = Math.abs(widgetPrice - shopbyPrice);
    const action = this.determineAction(difference);
    const isValid = action !== PriceValidationAction.BLOCK;
    const message = this.buildMessage(action, difference, widgetPrice, shopbyPrice);
    const timestamp = new Date().toISOString();

    if (this.config.enableLogging && action !== PriceValidationAction.PROCEED) {
      this.logWarning(action, difference, widgetPrice, shopbyPrice);
    }

    return {
      isValid,
      difference,
      action,
      message,
      widgetTotalPrice: widgetPrice,
      shopbyTotalPrice: shopbyPrice,
      timestamp,
    };
  }

  /**
   * Determine the validation action based on price difference.
   * @MX:NOTE: Thresholds are configurable via constructor
   */
  private determineAction(difference: number): PriceValidationAction {
    if (difference <= this.config.proceedThreshold) {
      return PriceValidationAction.PROCEED;
    }

    if (difference <= this.config.warnThreshold) {
      return PriceValidationAction.WARN;
    }

    return PriceValidationAction.BLOCK;
  }

  /**
   * Build a human-readable message for the validation result.
   */
  private buildMessage(
    action: PriceValidationAction,
    difference: number,
    widgetPrice: number,
    shopbyPrice: number,
  ): string {
    switch (action) {
      case PriceValidationAction.PROCEED:
        return `Price difference of ${difference} KRW is within rounding tolerance`;
      case PriceValidationAction.WARN:
        return `Price difference of ${difference} KRW exceeds tolerance (widget: ${widgetPrice}, shopby: ${shopbyPrice}). Admin notification recommended.`;
      case PriceValidationAction.BLOCK:
        return `Price difference of ${difference} KRW exceeds safe threshold. Order blocked. Widget: ${widgetPrice} KRW, Shopby: ${shopbyPrice} KRW`;
      default:
        return 'Unknown validation result';
    }
  }

  /**
   * Log warning to console for non-PROCEED actions.
   */
  private logWarning(
    action: PriceValidationAction,
    difference: number,
    widgetPrice: number,
    shopbyPrice: number,
  ): void {
    const level = action === PriceValidationAction.BLOCK ? 'error' : 'warn';
    console[level](
      `[PriceValidator] ${action}: Difference=${difference} KRW, Widget=${widgetPrice}, Shopby=${shopbyPrice}`,
    );
  }

  /**
   * Update validation configuration.
   */
  updateConfig(config: Partial<PriceValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current validation configuration.
   */
  getConfig(): PriceValidationConfig {
    return { ...this.config };
  }

  /**
   * Quick check if price difference would block the order.
   * Useful for pre-validation before making API calls.
   */
  wouldBlock(widgetPrice: number, shopbyPrice: number): boolean {
    const difference = Math.abs(widgetPrice - shopbyPrice);
    return difference > this.config.warnThreshold;
  }

  /**
   * Validate and throw if price difference would block the order.
   * @throws Error if validation action is BLOCK
   */
  validateOrThrow(widgetPrice: number, shopbyPrice: number): PriceValidationResult {
    const result = this.validate(widgetPrice, shopbyPrice);

    if (!result.isValid) {
      throw new Error(result.message);
    }

    return result;
  }
}

/**
 * Create a price validation result for a warning scenario.
 * Utility function for admin notification handlers.
 */
export function createWarningResult(
  widgetPrice: number,
  shopbyPrice: number,
  difference: number,
): PriceValidationResult {
  return {
    isValid: true,
    difference,
    action: PriceValidationAction.WARN,
    message: `Price discrepancy detected: ${difference} KRW difference`,
    widgetTotalPrice: widgetPrice,
    shopbyTotalPrice: shopbyPrice,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a price validation result for a block scenario.
 * Utility function for error handlers.
 */
export function createBlockResult(
  widgetPrice: number,
  shopbyPrice: number,
  difference: number,
): PriceValidationResult {
  return {
    isValid: false,
    difference,
    action: PriceValidationAction.BLOCK,
    message: `Order blocked: Price difference of ${difference} KRW exceeds safe threshold`,
    widgetTotalPrice: widgetPrice,
    shopbyTotalPrice: shopbyPrice,
    timestamp: new Date().toISOString(),
  };
}
