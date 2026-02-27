// Domain-specific error classes (REQ-CROSS-001)

export type PricingErrorCode =
  | 'UNKNOWN_MODEL'
  | 'TIER_NOT_FOUND'
  | 'IMPOSITION_NOT_FOUND'
  | 'FIXED_PRICE_NOT_FOUND'
  | 'PACKAGE_PRICE_NOT_FOUND'
  | 'INVALID_QUANTITY'
  | 'INVALID_SIZE';

export type ConstraintErrorCode =
  | 'INVALID_OPERATOR'
  | 'CIRCULAR_DEPENDENCY'
  | 'EVALUATION_TIMEOUT'
  | 'INCOMPATIBLE_OPTIONS';

export type OptionErrorCode =
  | 'INVALID_TRANSITION'
  | 'OPTION_NOT_FOUND'
  | 'CHOICE_NOT_AVAILABLE'
  | 'REQUIRED_OPTION_MISSING';

export class CoreError extends Error {
  constructor(
    public readonly code: string,
    public readonly context: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? `Core error: ${code}`);
    this.name = 'CoreError';
  }
}

export class PricingError extends CoreError {
  constructor(code: PricingErrorCode, context: Record<string, unknown>) {
    super(code, context, `Pricing error: ${code}`);
    this.name = 'PricingError';
  }
}

export class ConstraintError extends CoreError {
  constructor(code: ConstraintErrorCode, context: Record<string, unknown>) {
    super(code, context, `Constraint error: ${code}`);
    this.name = 'ConstraintError';
  }
}

export class OptionError extends CoreError {
  constructor(code: OptionErrorCode, context: Record<string, unknown>) {
    super(code, context, `Option error: ${code}`);
    this.name = 'OptionError';
  }
}
