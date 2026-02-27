/**
 * Shopby Order Status Manager
 *
 * Manages order lifecycle states and status transitions for the widget SDK.
 * Implements order processing workflow with validation rules and history tracking.
 *
 * @see SPEC-SHOPBY-006 Section: Order Status Management
 * @MX:SPEC: SPEC-SHOPBY-006
 */

// =============================================================================
// SECTION 1: Order Status Enum
// =============================================================================

/**
 * Order lifecycle states following the print production workflow.
 * States progress from payment completion through delivery.
 */
export const OrderStatus = {
  /** Payment completed, awaiting order confirmation */
  PAYMENT_DONE: 'PAYMENT_DONE',
  /** Order confirmed by seller/admin */
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  /** Ready for production, all materials prepared */
  PRODUCTION_READY: 'PRODUCTION_READY',
  /** Currently in production (printing) */
  IN_PRODUCTION: 'IN_PRODUCTION',
  /** Quality control passed */
  QC_PASSED: 'QC_PASSED',
  /** Ready for shipping, packaged */
  SHIPPING_READY: 'SHIPPING_READY',
  /** Shipped to customer */
  SHIPPED: 'SHIPPED',
  /** Delivered to customer */
  DELIVERED: 'DELIVERED',
  /** Order cancelled */
  CANCELLED: 'CANCELLED',
  /** Claim (return/exchange/reprint) in progress */
  CLAIM_PROCESSING: 'CLAIM_PROCESSING',
} as const;

export type OrderStatus =
  (typeof OrderStatus)[keyof typeof OrderStatus];

// =============================================================================
// SECTION 2: Status Transition Rules
// =============================================================================

/**
 * Valid status transitions mapped from current status to allowed next statuses.
 * @MX:NOTE: Transition rules enforce production workflow sequence
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PAYMENT_DONE]: [
    OrderStatus.ORDER_CONFIRMED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ORDER_CONFIRMED]: [
    OrderStatus.PRODUCTION_READY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PRODUCTION_READY]: [
    OrderStatus.IN_PRODUCTION,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.IN_PRODUCTION]: [
    OrderStatus.QC_PASSED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.QC_PASSED]: [
    OrderStatus.SHIPPING_READY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPING_READY]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.DELIVERED,
    OrderStatus.CLAIM_PROCESSING,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.CLAIM_PROCESSING,
  ],
  [OrderStatus.CANCELLED]: [], // Terminal state
  [OrderStatus.CLAIM_PROCESSING]: [
    OrderStatus.DELIVERED, // After exchange/reprint
    OrderStatus.CANCELLED, // After return/refund
  ],
};

// =============================================================================
// SECTION 3: Status History Types
// =============================================================================

/**
 * Record of a single status change event
 */
export interface StatusHistoryEntry {
  /** Order identifier */
  orderId: string;
  /** Previous status (null for initial status) */
  fromStatus: OrderStatus | null;
  /** New status */
  toStatus: OrderStatus;
  /** Timestamp of status change (ISO 8601) */
  timestamp: string;
  /** User or system that initiated the change */
  changedBy: string;
  /** Optional reason for status change */
  reason?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a status transition operation
 */
export interface StatusTransitionResult {
  /** Whether the transition succeeded */
  success: boolean;
  /** Previous status */
  fromStatus: OrderStatus;
  /** New status (if successful) */
  toStatus?: OrderStatus;
  /** Error message (if failed) */
  error?: string;
  /** History entry (if successful) */
  historyEntry?: StatusHistoryEntry;
}

// =============================================================================
// SECTION 4: Order Status Manager Class
// =============================================================================

/**
 * Manages order status transitions and history tracking.
 *
 * @MX:ANCHOR: Order status management - central point for all order lifecycle changes
 * @MX:REASON: Multiple components need to query and modify order status
 */
export class OrderStatusManager {
  private statusMap: Map<string, OrderStatus> = new Map();
  private historyMap: Map<string, StatusHistoryEntry[]> = new Map();

  /**
   * Get the current status of an order.
   * Returns undefined if order not found.
   */
  getStatus(orderId: string): OrderStatus | undefined {
    return this.statusMap.get(orderId);
  }

  /**
   * Initialize an order with its initial status.
   * Typically called when order is created from payment.
   */
  initializeOrder(
    orderId: string,
    initialStatus: OrderStatus = OrderStatus.PAYMENT_DONE,
    changedBy: string = 'system',
    metadata?: Record<string, unknown>,
  ): StatusHistoryEntry {
    if (this.statusMap.has(orderId)) {
      throw new Error(`Order ${orderId} already exists`);
    }

    this.statusMap.set(orderId, initialStatus);

    const entry: StatusHistoryEntry = {
      orderId,
      fromStatus: null,
      toStatus: initialStatus,
      timestamp: new Date().toISOString(),
      changedBy,
      metadata,
    };

    this.historyMap.set(orderId, [entry]);
    return entry;
  }

  /**
   * Validate and transition order to a new status.
   * Returns result indicating success or failure with reason.
   *
   * @MX:NOTE: Transition validation enforces production workflow rules
   */
  transitionStatus(
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    changedBy: string = 'system',
    reason?: string,
    metadata?: Record<string, unknown>,
  ): StatusTransitionResult {
    const currentStatus = this.statusMap.get(orderId);

    // Verify order exists
    if (!currentStatus) {
      return {
        success: false,
        fromStatus,
        error: `Order ${orderId} not found`,
      };
    }

    // Verify current status matches expected fromStatus
    if (currentStatus !== fromStatus) {
      return {
        success: false,
        fromStatus,
        error: `Status mismatch: expected ${fromStatus}, but current status is ${currentStatus}`,
      };
    }

    // Validate transition is allowed
    const allowedTransitions = VALID_TRANSITIONS[fromStatus];
    if (!allowedTransitions.includes(toStatus)) {
      return {
        success: false,
        fromStatus,
        error: `Invalid transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      };
    }

    // Perform transition
    this.statusMap.set(orderId, toStatus);

    const entry: StatusHistoryEntry = {
      orderId,
      fromStatus,
      toStatus,
      timestamp: new Date().toISOString(),
      changedBy,
      reason,
      metadata,
    };

    const history = this.historyMap.get(orderId) ?? [];
    history.push(entry);
    this.historyMap.set(orderId, history);

    return {
      success: true,
      fromStatus,
      toStatus,
      historyEntry: entry,
    };
  }

  /**
   * Get the complete status history for an order.
   * Returns empty array if order not found.
   */
  getStatusHistory(orderId: string): StatusHistoryEntry[] {
    return this.historyMap.get(orderId) ?? [];
  }

  /**
   * Get all valid next statuses for the current order status.
   * Returns empty array if order not found.
   */
  getValidNextStatuses(orderId: string): OrderStatus[] {
    const currentStatus = this.statusMap.get(orderId);
    if (!currentStatus) {
      return [];
    }
    return VALID_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Check if a transition is valid without performing it.
   */
  isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
    const allowed = VALID_TRANSITIONS[fromStatus];
    return allowed?.includes(toStatus) ?? false;
  }

  /**
   * Check if an order is in a terminal state (no further transitions).
   */
  isTerminalStatus(status: OrderStatus): boolean {
    return VALID_TRANSITIONS[status].length === 0;
  }

  /**
   * Get the latest history entry for an order.
   * Returns undefined if order has no history.
   */
  getLatestHistoryEntry(orderId: string): StatusHistoryEntry | undefined {
    const history = this.historyMap.get(orderId);
    if (!history || history.length === 0) {
      return undefined;
    }
    return history[history.length - 1];
  }

  /**
   * Clear order data (useful for testing or cleanup).
   */
  clearOrder(orderId: string): void {
    this.statusMap.delete(orderId);
    this.historyMap.delete(orderId);
  }

  /**
   * Clear all order data.
   */
  clearAll(): void {
    this.statusMap.clear();
    this.historyMap.clear();
  }
}

// =============================================================================
// SECTION 5: Helper Functions
// =============================================================================

/**
 * Get human-readable label for an order status.
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PAYMENT_DONE]: 'Payment Complete',
    [OrderStatus.ORDER_CONFIRMED]: 'Order Confirmed',
    [OrderStatus.PRODUCTION_READY]: 'Production Ready',
    [OrderStatus.IN_PRODUCTION]: 'In Production',
    [OrderStatus.QC_PASSED]: 'Quality Check Passed',
    [OrderStatus.SHIPPING_READY]: 'Ready for Shipping',
    [OrderStatus.SHIPPED]: 'Shipped',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.CANCELLED]: 'Cancelled',
    [OrderStatus.CLAIM_PROCESSING]: 'Processing Claim',
  };
  return labels[status] ?? status;
}

/**
 * Check if status is a production-related status.
 */
export function isProductionStatus(status: OrderStatus): boolean {
  const productionStatuses: OrderStatus[] = [
    OrderStatus.PRODUCTION_READY,
    OrderStatus.IN_PRODUCTION,
    OrderStatus.QC_PASSED,
  ];
  return productionStatuses.includes(status);
}

/**
 * Check if status allows cancellation.
 */
export function isCancellable(status: OrderStatus): boolean {
  const cancellableStatuses: readonly OrderStatus[] = [
    OrderStatus.PAYMENT_DONE,
    OrderStatus.ORDER_CONFIRMED,
    OrderStatus.PRODUCTION_READY,
    OrderStatus.IN_PRODUCTION,
    OrderStatus.QC_PASSED,
    OrderStatus.SHIPPING_READY,
  ] as const;
  return (cancellableStatuses as OrderStatus[]).includes(status);
}

/**
 * Check if status allows claims (returns/exchanges).
 */
export function isClaimable(status: OrderStatus): boolean {
  const claimableStatuses: OrderStatus[] = [
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];
  return claimableStatuses.includes(status);
}

// =============================================================================
// SECTION 6: Singleton Instance (Optional)
// =============================================================================

/**
 * Default singleton instance for simple use cases.
 * @MX:NOTE: Use dependency injection for testing and complex applications
 */
let defaultInstance: OrderStatusManager | null = null;

/**
 * Get the default OrderStatusManager instance.
 * Creates instance on first call.
 */
export function getOrderStatusManager(): OrderStatusManager {
  if (!defaultInstance) {
    defaultInstance = new OrderStatusManager();
  }
  return defaultInstance;
}

/**
 * Reset the default instance (useful for testing).
 */
export function resetOrderStatusManager(): void {
  defaultInstance = null;
}
