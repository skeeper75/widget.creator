/**
 * Shopby Claim Handler
 *
 * Handles order claims including cancellations, returns, exchanges, and reprints.
 * Implements claim policy validation and refund calculation.
 *
 * @see SPEC-SHOPBY-006 Section: Claim Handling
 * @MX:SPEC: SPEC-SHOPBY-006
 */

import { OrderStatus, isCancellable, isClaimable } from './order-status';

// =============================================================================
// SECTION 1: Claim Types
// =============================================================================

/**
 * Types of claims that can be processed
 */
export const ClaimType = {
  CANCEL: 'CANCEL',       // Cancel order before production
  RETURN: 'RETURN',       // Return for refund after delivery
  EXCHANGE: 'EXCHANGE',   // Exchange for same product
  REPRINT: 'REPRINT',     // Reprint due to defect
} as const;

export type ClaimType = (typeof ClaimType)[keyof typeof ClaimType];

/**
 * Status of a claim request
 */
export const ClaimStatus = {
  REQUESTED: 'REQUESTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ClaimStatus =
  (typeof ClaimStatus)[keyof typeof ClaimStatus];

// =============================================================================
// SECTION 2: Claim Request/Response Types
// =============================================================================

/**
 * Request to create a new claim
 */
export interface ClaimRequest {
  /** Order identifier */
  orderId: string;
  /** Order number for display */
  orderNumber?: string;
  /** Type of claim */
  type: ClaimType;
  /** Reason for the claim */
  reason: string;
  /** Detailed explanation */
  detail?: string;
  /** Attachments (photos of defects, etc.) */
  attachments?: string[];
  /** Requested resolution (for exchanges) */
  requestedResolution?: string;
  /** Bank account for refund */
  refundAccount?: {
    bank: string;
    accountNumber: string;
    accountHolder: string;
  };
}

/**
 * Claim record with full details
 */
export interface ClaimRecord {
  /** Unique claim identifier */
  claimId: string;
  /** Order identifier */
  orderId: string;
  /** Order number */
  orderNumber?: string;
  /** Claim type */
  type: ClaimType;
  /** Current status */
  status: ClaimStatus;
  /** Reason provided by customer */
  reason: string;
  /** Detailed explanation */
  detail?: string;
  /** Attachments */
  attachments?: string[];
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Resolution details (if processed) */
  resolution?: {
    type: 'refund' | 'exchange' | 'reprint';
    amount?: number;
    currency?: string;
    notes?: string;
  };
  /** Admin notes (internal) */
  adminNotes?: string;
}

/**
 * Result of claim creation
 */
export interface ClaimResult {
  /** Whether claim creation succeeded */
  success: boolean;
  /** Claim record (if successful) */
  claim?: ClaimRecord;
  /** Error message (if failed) */
  error?: string;
  /** Validation errors */
  validationErrors?: string[];
}

/**
 * Calculated refund details
 */
export interface RefundCalculation {
  /** Original order amount */
  originalAmount: number;
  /** Shipping fee (non-refundable) */
  shippingFee: number;
  /** Deduction for used materials */
  materialDeduction: number;
  /** Deduction for production started */
  productionDeduction: number;
  /** Penalty/fee */
  penalty: number;
  /** Final refund amount */
  refundAmount: number;
  /** Currency code */
  currency: string;
  /** Calculation breakdown */
  breakdown: {
    item: string;
    amount: number;
  }[];
}

// =============================================================================
// SECTION 3: Claim Policy Types
// =============================================================================

/**
 * Claim policy rules based on order status
 */
export interface ClaimPolicy {
  /** Whether this claim type is allowed for current status */
  allowed: boolean;
  /** Reason if not allowed */
  notAllowedReason?: string;
  /** Maximum refund percentage (0-100) */
  maxRefundPercentage: number;
  /** Whether shipping fee is refundable */
  refundShippingFee: boolean;
  /** Production deduction percentage (0-100) */
  productionDeductionPercentage: number;
  /** Required evidence (photos, etc.) */
  requiredEvidence: string[];
  /** Time limit in days (0 = no limit) */
  timeLimitDays: number;
  /** Additional notes */
  notes?: string;
}

/**
 * Claim policies by order status
 */
export interface ClaimPolicyMap {
  [status: string]: {
    [claimType in ClaimType]?: ClaimPolicy;
  };
}

// =============================================================================
// SECTION 4: Default Claim Policies
// =============================================================================

/**
 * Default claim policies based on order status.
 * @MX:NOTE: Business rules for claim eligibility and refund rates
 */
const DEFAULT_POLICIES: ClaimPolicyMap = {
  [OrderStatus.PAYMENT_DONE]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 100,
      refundShippingFee: true,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
    [ClaimType.RETURN]: {
      allowed: false,
      notAllowedReason: 'Order not yet delivered',
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
    [ClaimType.EXCHANGE]: {
      allowed: false,
      notAllowedReason: 'Order not yet delivered',
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
    [ClaimType.REPRINT]: {
      allowed: false,
      notAllowedReason: 'Order not yet delivered',
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
  },
  [OrderStatus.ORDER_CONFIRMED]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 100,
      refundShippingFee: true,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
  },
  [OrderStatus.PRODUCTION_READY]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 90,
      refundShippingFee: true,
      productionDeductionPercentage: 10,
      requiredEvidence: [],
      timeLimitDays: 0,
      notes: '10% deduction for production preparation',
    },
  },
  [OrderStatus.IN_PRODUCTION]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 50,
      refundShippingFee: false,
      productionDeductionPercentage: 50,
      requiredEvidence: [],
      timeLimitDays: 0,
      notes: '50% deduction for production in progress',
    },
  },
  [OrderStatus.QC_PASSED]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 30,
      refundShippingFee: false,
      productionDeductionPercentage: 70,
      requiredEvidence: [],
      timeLimitDays: 0,
      notes: '70% deduction - production completed',
    },
  },
  [OrderStatus.SHIPPING_READY]: {
    [ClaimType.CANCEL]: {
      allowed: true,
      maxRefundPercentage: 20,
      refundShippingFee: false,
      productionDeductionPercentage: 80,
      requiredEvidence: [],
      timeLimitDays: 0,
      notes: '80% deduction - ready for shipping',
    },
  },
  [OrderStatus.SHIPPED]: {
    [ClaimType.RETURN]: {
      allowed: true,
      maxRefundPercentage: 100,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 7,
    },
    [ClaimType.EXCHANGE]: {
      allowed: true,
      maxRefundPercentage: 0, // Exchange, no refund
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 7,
    },
    [ClaimType.REPRINT]: {
      allowed: true,
      maxRefundPercentage: 0, // Reprint, no refund
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 7,
    },
    [ClaimType.CANCEL]: {
      allowed: false,
      notAllowedReason: 'Order already shipped - use return instead',
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
  },
  [OrderStatus.DELIVERED]: {
    [ClaimType.RETURN]: {
      allowed: true,
      maxRefundPercentage: 100,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 14,
    },
    [ClaimType.EXCHANGE]: {
      allowed: true,
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 14,
    },
    [ClaimType.REPRINT]: {
      allowed: true,
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: ['photo'],
      timeLimitDays: 30,
    },
    [ClaimType.CANCEL]: {
      allowed: false,
      notAllowedReason: 'Order already delivered - use return instead',
      maxRefundPercentage: 0,
      refundShippingFee: false,
      productionDeductionPercentage: 0,
      requiredEvidence: [],
      timeLimitDays: 0,
    },
  },
};

// =============================================================================
// SECTION 5: Claim Handler Class
// =============================================================================

/**
 * Handles order claims with policy validation and refund calculation.
 *
 * @MX:ANCHOR: Claim processing - manages cancellation, return, exchange, reprint requests
 * @MX:REASON: Central business logic for all claim operations
 */
export class ClaimHandler {
  private claims: Map<string, ClaimRecord> = new Map();
  private orderClaims: Map<string, string[]> = new Map();
  private policies: ClaimPolicyMap;

  constructor(customPolicies?: ClaimPolicyMap) {
    this.policies = customPolicies ?? DEFAULT_POLICIES;
  }

  /**
   * Create a new claim request.
   *
   * @param request - Claim request details
   * @param orderStatus - Current order status
   * @param orderAmount - Original order amount
   * @param orderDate - Order creation date (for time limit validation)
   */
  createClaim(
    request: ClaimRequest,
    orderStatus: OrderStatus,
    orderAmount: number,
    orderDate?: string,
  ): ClaimResult {
    // Get policy for this status and claim type
    const policy = this.getClaimPolicy(orderStatus, request.type);

    // Validate claim eligibility
    const validationErrors = this.validateClaim(request, policy, orderDate);
    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors,
        error: 'Claim validation failed',
      };
    }

    // Create claim record
    const claimId = this.generateClaimId();
    const now = new Date().toISOString();

    const claim: ClaimRecord = {
      claimId,
      orderId: request.orderId,
      orderNumber: request.orderNumber,
      type: request.type,
      status: ClaimStatus.REQUESTED,
      reason: request.reason,
      detail: request.detail,
      attachments: request.attachments,
      createdAt: now,
      updatedAt: now,
    };

    // Store claim
    this.claims.set(claimId, claim);

    // Track claims per order
    const orderClaimIds = this.orderClaims.get(request.orderId) ?? [];
    orderClaimIds.push(claimId);
    this.orderClaims.set(request.orderId, orderClaimIds);

    return {
      success: true,
      claim,
    };
  }

  /**
   * Get claim policy for a specific order status and claim type.
   */
  getClaimPolicy(orderStatus: OrderStatus, claimType: ClaimType): ClaimPolicy {
    const statusPolicies = this.policies[orderStatus];
    if (!statusPolicies) {
      return {
        allowed: false,
        notAllowedReason: `No policy defined for status: ${orderStatus}`,
        maxRefundPercentage: 0,
        refundShippingFee: false,
        productionDeductionPercentage: 0,
        requiredEvidence: [],
        timeLimitDays: 0,
      };
    }

    const policy = statusPolicies[claimType];
    if (!policy) {
      return {
        allowed: false,
        notAllowedReason: `Claim type ${claimType} not allowed for status: ${orderStatus}`,
        maxRefundPercentage: 0,
        refundShippingFee: false,
        productionDeductionPercentage: 0,
        requiredEvidence: [],
        timeLimitDays: 0,
      };
    }

    return policy;
  }

  /**
   * Calculate refund amount for a claim.
   *
   * @param orderId - Order identifier
   * @param orderAmount - Original order amount
   * @param shippingFee - Shipping fee amount
   * @param orderStatus - Current order status
   * @param claimType - Type of claim
   */
  calculateRefund(
    orderId: string,
    orderAmount: number,
    shippingFee: number,
    orderStatus: OrderStatus,
    claimType: ClaimType,
  ): RefundCalculation {
    const policy = this.getClaimPolicy(orderStatus, claimType);
    const breakdown: { item: string; amount: number }[] = [];

    // Start with original amount
    let refundAmount = orderAmount;
    breakdown.push({ item: 'Original amount', amount: orderAmount });

    // Apply refund percentage
    const maxRefund = (orderAmount * policy.maxRefundPercentage) / 100;
    if (maxRefund < orderAmount) {
      const deduction = orderAmount - maxRefund;
      refundAmount = maxRefund;
      breakdown.push({ item: 'Policy deduction', amount: -deduction });
    }

    // Shipping fee
    if (!policy.refundShippingFee && shippingFee > 0) {
      breakdown.push({ item: 'Shipping fee (non-refundable)', amount: -shippingFee });
    } else if (policy.refundShippingFee && shippingFee > 0) {
      refundAmount += shippingFee;
      breakdown.push({ item: 'Shipping fee refund', amount: shippingFee });
    }

    // Production deduction
    if (policy.productionDeductionPercentage > 0) {
      const productionDeduction =
        (orderAmount * policy.productionDeductionPercentage) / 100;
      refundAmount -= productionDeduction;
      breakdown.push({
        item: 'Production deduction',
        amount: -productionDeduction,
      });
    }

    // Ensure non-negative
    refundAmount = Math.max(0, refundAmount);

    return {
      originalAmount: orderAmount,
      shippingFee,
      materialDeduction: 0,
      productionDeduction: (orderAmount * policy.productionDeductionPercentage) / 100,
      penalty: 0,
      refundAmount,
      currency: 'KRW',
      breakdown,
    };
  }

  /**
   * Get a claim by its ID.
   */
  getClaim(claimId: string): ClaimRecord | undefined {
    return this.claims.get(claimId);
  }

  /**
   * Get all claims for an order.
   */
  getOrderClaims(orderId: string): ClaimRecord[] {
    const claimIds = this.orderClaims.get(orderId) ?? [];
    return claimIds
      .map((id) => this.claims.get(id))
      .filter((claim): claim is ClaimRecord => claim !== undefined);
  }

  /**
   * Update claim status.
   */
  updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    resolution?: ClaimRecord['resolution'],
    adminNotes?: string,
  ): ClaimRecord | null {
    const claim = this.claims.get(claimId);
    if (!claim) {
      return null;
    }

    const updated: ClaimRecord = {
      ...claim,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      resolution,
      adminNotes,
    };

    this.claims.set(claimId, updated);
    return updated;
  }

  /**
   * Check if an order can be cancelled.
   */
  canCancel(orderStatus: OrderStatus): boolean {
    return isCancellable(orderStatus);
  }

  /**
   * Check if an order can have a claim filed (return/exchange).
   */
  canFileClaim(orderStatus: OrderStatus): boolean {
    return isClaimable(orderStatus);
  }

  /**
   * Validate claim request against policy.
   */
  private validateClaim(
    request: ClaimRequest,
    policy: ClaimPolicy,
    orderDate?: string,
  ): string[] {
    const errors: string[] = [];

    // Check if allowed
    if (!policy.allowed) {
      errors.push(policy.notAllowedReason ?? 'Claim not allowed');
      return errors;
    }

    // Check time limit
    if (policy.timeLimitDays > 0 && orderDate) {
      const orderTime = new Date(orderDate).getTime();
      const now = Date.now();
      const daysSinceOrder = (now - orderTime) / (1000 * 60 * 60 * 24);
      if (daysSinceOrder > policy.timeLimitDays) {
        errors.push(
          `Claim must be filed within ${policy.timeLimitDays} days of order`,
        );
      }
    }

    // Check required evidence
    if (policy.requiredEvidence.includes('photo')) {
      if (!request.attachments || request.attachments.length === 0) {
        errors.push('Photo evidence is required for this claim');
      }
    }

    // Validate reason
    if (!request.reason || request.reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters');
    }

    return errors;
  }

  /**
   * Generate a unique claim ID.
   */
  private generateClaimId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CLM-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Clear all claims (for testing/cleanup).
   */
  clearClaims(): void {
    this.claims.clear();
    this.orderClaims.clear();
  }
}

// =============================================================================
// SECTION 6: Factory Function
// =============================================================================

/**
 * Create a ClaimHandler instance with optional custom policies.
 */
export function createClaimHandler(customPolicies?: ClaimPolicyMap): ClaimHandler {
  return new ClaimHandler(customPolicies);
}

// =============================================================================
// SECTION 7: Utility Functions
// =============================================================================

/**
 * Get human-readable label for claim type.
 */
export function getClaimTypeLabel(type: ClaimType): string {
  const labels: Record<ClaimType, string> = {
    [ClaimType.CANCEL]: 'Cancellation',
    [ClaimType.RETURN]: 'Return',
    [ClaimType.EXCHANGE]: 'Exchange',
    [ClaimType.REPRINT]: 'Reprint',
  };
  return labels[type] ?? type;
}

/**
 * Get human-readable label for claim status.
 */
export function getClaimStatusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    [ClaimStatus.REQUESTED]: 'Requested',
    [ClaimStatus.PENDING_REVIEW]: 'Pending Review',
    [ClaimStatus.APPROVED]: 'Approved',
    [ClaimStatus.REJECTED]: 'Rejected',
    [ClaimStatus.PROCESSING]: 'Processing',
    [ClaimStatus.COMPLETED]: 'Completed',
    [ClaimStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] ?? status;
}

// =============================================================================
// SECTION 8: Singleton Instance
// =============================================================================

let defaultInstance: ClaimHandler | null = null;

/**
 * Get the default ClaimHandler instance.
 */
export function getClaimHandler(): ClaimHandler {
  if (!defaultInstance) {
    defaultInstance = new ClaimHandler();
  }
  return defaultInstance;
}

/**
 * Reset the default instance.
 */
export function resetClaimHandler(): void {
  defaultInstance = null;
}
