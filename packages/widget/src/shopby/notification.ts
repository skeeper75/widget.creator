/**
 * Shopby Notification Service
 *
 * Handles customer notifications for order status changes,
 * production updates, and shipping information across multiple channels.
 *
 * @see SPEC-SHOPBY-006 Section: Notification Service
 * @MX:SPEC: SPEC-SHOPBY-006
 */

// =============================================================================
// SECTION 1: Notification Types
// =============================================================================

/**
 * Types of notifications that can be sent to customers
 */
export const NotificationType = {
  ORDER_RECEIVED: 'ORDER_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PRODUCTION_STARTED: 'PRODUCTION_STARTED',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  QC_PASSED: 'QC_PASSED',
  SHIPPING_READY: 'SHIPPING_READY',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CLAIM_PROCESSED: 'CLAIM_PROCESSED',
  CLAIM_REJECTED: 'CLAIM_REJECTED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Communication channels for notifications
 */
export const NotificationChannel = {
  ALIMTALK: 'ALIMTALK',  // KakaoTalk Alimtalk
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

// =============================================================================
// SECTION 2: Notification Payload Types
// =============================================================================

/**
 * Customer contact information
 */
export interface CustomerContact {
  /** Customer name */
  name: string;
  /** Email address */
  email?: string;
  /** Phone number (for SMS/Alimtalk) */
  phone?: string;
  /** Push token (for push notifications) */
  pushToken?: string;
}

/**
 * Order information for notification template
 */
export interface OrderInfo {
  /** Order identifier */
  orderId: string;
  /** Order number for display */
  orderNumber?: string;
  /** Product name */
  productName: string;
  /** Quantity */
  quantity: number;
  /** Order amount */
  amount?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Shipping information for notification template
 */
export interface ShippingInfo {
  /** Tracking number */
  trackingNumber?: string;
  /** Courier company name */
  courierCompany?: string;
  /** Estimated delivery date (ISO 8601) */
  estimatedDelivery?: string;
  /** Delivery address (masked for privacy) */
  deliveryAddress?: string;
}

/**
 * Production progress information
 */
export interface ProductionInfo {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current production stage */
  stage: string;
  /** Estimated completion date (ISO 8601) */
  estimatedCompletion?: string;
}

/**
 * Claim information for notification template
 */
export interface ClaimInfo {
  /** Claim type (cancel, return, exchange, reprint) */
  claimType: string;
  /** Claim reason */
  reason: string;
  /** Refund amount (if applicable) */
  refundAmount?: number;
}

/**
 * Complete notification request payload
 */
export interface NotificationRequest {
  /** Type of notification */
  type: NotificationType;
  /** Channel to send through */
  channel: NotificationChannel;
  /** Customer contact information */
  customer: CustomerContact;
  /** Order information */
  order: OrderInfo;
  /** Shipping information (optional, for shipping notifications) */
  shipping?: ShippingInfo;
  /** Production information (optional, for progress updates) */
  production?: ProductionInfo;
  /** Claim information (optional, for claim notifications) */
  claim?: ClaimInfo;
  /** Additional template variables */
  templateVars?: Record<string, string | number>;
  /** Override default template ID */
  templateId?: string;
}

/**
 * Result of a notification send operation
 */
export interface NotificationResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** Notification ID (if successful) */
  notificationId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Channel that was used */
  channel: NotificationChannel;
  /** Timestamp of send attempt */
  timestamp: string;
}

// =============================================================================
// SECTION 3: Notification Template Types
// =============================================================================

/**
 * Notification template definition
 */
export interface NotificationTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template type */
  type: NotificationType;
  /** Supported channels */
  channels: NotificationChannel[];
  /** Subject line (for email) */
  subject?: string;
  /** Template content with variable placeholders */
  content: string;
  /** Template code for Alimtalk (required for ALIMTALK channel) */
  alimtalkCode?: string;
}

// =============================================================================
// SECTION 4: Notification Service Configuration
// =============================================================================

/**
 * Configuration for Notification Service
 */
export interface NotificationServiceConfig {
  /** API base URL for notification gateway */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Default sender email address */
  senderEmail?: string;
  /** Default sender phone number */
  senderPhone?: string;
  /** Enabled channels */
  enabledChannels?: NotificationChannel[];
  /** Default channel priority */
  channelPriority?: NotificationChannel[];
  /** Timeout for API requests in milliseconds */
  timeout?: number;
}

// =============================================================================
// SECTION 5: Notification Service Class
// =============================================================================

/**
 * Service for sending order notifications across multiple channels.
 *
 * @MX:ANCHOR: Customer notification management - sends order updates to customers
 * @MX:REASON: Central point for all customer communications
 */
export class NotificationService {
  private config: NotificationServiceConfig;
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(config: NotificationServiceConfig) {
    this.config = {
      timeout: 15000,
      enabledChannels: [
        NotificationChannel.ALIMTALK,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ],
      channelPriority: [
        NotificationChannel.ALIMTALK,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ],
      ...config,
    };

    this.initializeDefaultTemplates();
  }

  /**
   * Send a notification to a customer.
   *
   * @param orderId - Order identifier for reference
   * @param type - Type of notification to send
   * @param channel - Channel to send through
   * @param request - Full notification request
   */
  async sendNotification(
    orderId: string,
    type: NotificationType,
    channel: NotificationChannel,
    request: NotificationRequest,
  ): Promise<NotificationResult> {
    // Check if channel is enabled
    if (
      this.config.enabledChannels &&
      !this.config.enabledChannels.includes(channel)
    ) {
      return {
        success: false,
        error: `Channel ${channel} is not enabled`,
        channel,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate customer contact for channel
    const validationError = this.validateContactForChannel(
      request.customer,
      channel,
    );
    if (validationError) {
      return {
        success: false,
        error: validationError,
        channel,
        timestamp: new Date().toISOString(),
      };
    }

    // Get template and render content
    const template = this.getTemplate(type, channel);
    const content = this.renderTemplate(template, request);

    try {
      const response = await this.sendToGateway(channel, {
        to: this.getRecipientAddress(request.customer, channel),
        subject: template.subject,
        content,
        templateId: request.templateId ?? template.id,
        templateVars: request.templateVars,
        alimtalkCode: template.alimtalkCode,
      });

      return {
        success: true,
        notificationId: response.notificationId,
        channel,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send notification to best available channel.
   * Tries channels in priority order based on customer contact availability.
   */
  async sendToBestChannel(
    orderId: string,
    type: NotificationType,
    request: NotificationRequest,
  ): Promise<NotificationResult> {
    const priority = this.config.channelPriority ?? [
      NotificationChannel.ALIMTALK,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ];

    for (const channel of priority) {
      if (this.hasContactForChannel(request.customer, channel)) {
        const result = await this.sendNotification(
          orderId,
          type,
          channel,
          request,
        );
        if (result.success) {
          return result;
        }
      }
    }

    return {
      success: false,
      error: 'No available channel for notification',
      channel: NotificationChannel.EMAIL,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Register a custom notification template.
   */
  registerTemplate(template: NotificationTemplate): void {
    const key = `${template.type}:${template.channels.join(',')}`;
    this.templates.set(key, template);
  }

  /**
   * Get a template for a notification type and channel.
   */
  private getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): NotificationTemplate {
    const key = `${type}:${channel}`;
    const template = this.templates.get(key);

    if (template) {
      return template;
    }

    // Return default template
    return this.getDefaultTemplate(type, channel);
  }

  /**
   * Render template with request data.
   * @MX:NOTE: Template variables use {{variable}} syntax
   */
  private renderTemplate(
    template: NotificationTemplate,
    request: NotificationRequest,
  ): string {
    const vars: Record<string, string | number | undefined> = {
      customerName: request.customer.name,
      orderId: request.order.orderId,
      orderNumber: request.order.orderNumber ?? request.order.orderId,
      productName: request.order.productName,
      quantity: request.order.quantity,
      amount: request.order.amount,
      currency: request.order.currency ?? 'KRW',
      trackingNumber: request.shipping?.trackingNumber ?? '',
      courierCompany: request.shipping?.courierCompany ?? '',
      estimatedDelivery: request.shipping?.estimatedDelivery ?? '',
      progress: request.production?.progress ?? 0,
      productionStage: request.production?.stage ?? '',
      claimType: request.claim?.claimType ?? '',
      claimReason: request.claim?.reason ?? '',
      refundAmount: request.claim?.refundAmount ?? 0,
      ...request.templateVars,
    };

    let content = template.content;
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(
        new RegExp(placeholder, 'g'),
        String(value ?? ''),
      );
    }

    return content;
  }

  /**
   * Validate customer contact for a specific channel.
   */
  private validateContactForChannel(
    customer: CustomerContact,
    channel: NotificationChannel,
  ): string | null {
    switch (channel) {
      case NotificationChannel.ALIMTALK:
      case NotificationChannel.SMS:
        if (!customer.phone) {
          return `Phone number required for ${channel}`;
        }
        break;
      case NotificationChannel.EMAIL:
        if (!customer.email) {
          return 'Email address required for EMAIL channel';
        }
        break;
      case NotificationChannel.PUSH:
        if (!customer.pushToken) {
          return 'Push token required for PUSH channel';
        }
        break;
    }
    return null;
  }

  /**
   * Check if customer has contact info for a channel.
   */
  private hasContactForChannel(
    customer: CustomerContact,
    channel: NotificationChannel,
  ): boolean {
    switch (channel) {
      case NotificationChannel.ALIMTALK:
      case NotificationChannel.SMS:
        return !!customer.phone;
      case NotificationChannel.EMAIL:
        return !!customer.email;
      case NotificationChannel.PUSH:
        return !!customer.pushToken;
      default:
        return false;
    }
  }

  /**
   * Get recipient address based on channel.
   */
  private getRecipientAddress(
    customer: CustomerContact,
    channel: NotificationChannel,
  ): string {
    switch (channel) {
      case NotificationChannel.ALIMTALK:
      case NotificationChannel.SMS:
        return customer.phone ?? '';
      case NotificationChannel.EMAIL:
        return customer.email ?? '';
      case NotificationChannel.PUSH:
        return customer.pushToken ?? '';
      default:
        return '';
    }
  }

  /**
   * Send notification through gateway API.
   */
  private async sendToGateway(
    channel: NotificationChannel,
    payload: {
      to: string;
      subject?: string;
      content: string;
      templateId: string;
      templateVars?: Record<string, string | number>;
      alimtalkCode?: string;
    },
  ): Promise<{ notificationId: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout,
    );

    try {
      const response = await fetch(`${this.config.apiUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          channel,
          ...payload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.status}`);
      }

      const data = (await response.json()) as { notificationId: string };
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Initialize default notification templates.
   * @MX:NOTE: Templates can be overridden via registerTemplate()
   */
  private initializeDefaultTemplates(): void {
    // Default templates are minimal; real implementations should load from config
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'order-received-email',
        name: 'Order Received',
        type: NotificationType.ORDER_RECEIVED,
        channels: [NotificationChannel.EMAIL],
        subject: '[주문접수] {{productName}} 주문이 접수되었습니다',
        content: '{{customerName}}님, 주문해주셔서 감사합니다.\n\n주문번호: {{orderNumber}}\n상품명: {{productName}}\n수량: {{quantity}}',
      },
      {
        id: 'shipped-email',
        name: 'Shipped',
        type: NotificationType.SHIPPED,
        channels: [NotificationChannel.EMAIL],
        subject: '[배송시작] {{productName}} 배송이 시작되었습니다',
        content: '{{customerName}}님, 주문하신 상품이 발송되었습니다.\n\n운송장번호: {{trackingNumber}}\n택배사: {{courierCompany}}',
      },
    ];

    for (const template of defaultTemplates) {
      for (const channel of template.channels) {
        const key = `${template.type}:${channel}`;
        this.templates.set(key, template);
      }
    }
  }

  /**
   * Get default template for type and channel.
   */
  private getDefaultTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): NotificationTemplate {
    return {
      id: `default-${type.toLowerCase()}-${channel.toLowerCase()}`,
      name: type,
      type,
      channels: [channel],
      subject: `[${type}] Order Update`,
      content: '{{customerName}}님, 주문({{orderNumber}}) 상태가 업데이트되었습니다.',
    };
  }
}

// =============================================================================
// SECTION 6: Factory Function
// =============================================================================

/**
 * Create a Notification Service instance with configuration.
 */
export function createNotificationService(
  config: NotificationServiceConfig,
): NotificationService {
  return new NotificationService(config);
}

// =============================================================================
// SECTION 7: Utility Functions
// =============================================================================

/**
 * Get human-readable label for notification type.
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    [NotificationType.ORDER_RECEIVED]: 'Order Received',
    [NotificationType.PAYMENT_CONFIRMED]: 'Payment Confirmed',
    [NotificationType.PRODUCTION_STARTED]: 'Production Started',
    [NotificationType.PROGRESS_UPDATE]: 'Progress Update',
    [NotificationType.QC_PASSED]: 'Quality Check Passed',
    [NotificationType.SHIPPING_READY]: 'Ready for Shipping',
    [NotificationType.SHIPPED]: 'Shipped',
    [NotificationType.DELIVERED]: 'Delivered',
    [NotificationType.CLAIM_PROCESSED]: 'Claim Processed',
    [NotificationType.CLAIM_REJECTED]: 'Claim Rejected',
    [NotificationType.ORDER_CANCELLED]: 'Order Cancelled',
  };
  return labels[type] ?? type;
}

/**
 * Get human-readable label for notification channel.
 */
export function getChannelLabel(channel: NotificationChannel): string {
  const labels: Record<NotificationChannel, string> = {
    [NotificationChannel.ALIMTALK]: 'KakaoTalk Alimtalk',
    [NotificationChannel.EMAIL]: 'Email',
    [NotificationChannel.SMS]: 'SMS',
    [NotificationChannel.PUSH]: 'Push Notification',
  };
  return labels[channel] ?? channel;
}
