/**
 * Shopby Member Resolver
 *
 * Resolves member information and authentication state for the widget.
 * Provides member profile data and handles guest user scenarios.
 *
 * @see SPEC-SHOPBY-004 Section: Member Resolution
 * @MX:ANCHOR: Member information resolution - provides user context for orders
 * @MX:NOTE: Supports both authenticated members and guest users
 * @MX:SPEC: SPEC-SHOPBY-004
 */

import type { ShopbyAuthConnector } from './auth-connector';
import type { ShopbyWidgetError } from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Shop API base URL */
const DEFAULT_API_BASE = 'https://api.shopby.co.kr/shop/v1' as const;

/**
 * Member profile information from Shopby.
 */
export interface MemberProfile {
  /** Member ID */
  memberId: string;
  /** Member name */
  memberName: string;
  /** Email address */
  email: string;
  /** Phone number */
  phoneNumber?: string;
  /** Member grade */
  memberGrade: string;
  /** Available point balance */
  availablePoint: number;
  /** Total order count */
  orderCount: number;
  /** Whether email is verified */
  emailVerified: boolean;
  /** Registration date */
  joinedAt?: string;
  /** Last login date */
  lastLoginAt?: string;
}

/**
 * Guest user information form fields.
 * Required for non-member orders.
 */
export interface GuestInfoForm {
  /** Guest name */
  name: string;
  /** Guest email */
  email: string;
  /** Guest phone number */
  phone: string;
  /** Whether to receive SMS notifications */
  smsNotification?: boolean;
  /** Whether to receive email notifications */
  emailNotification?: boolean;
}

/**
 * Guest form field configuration for UI rendering.
 */
export interface GuestFormField {
  /** Field name */
  name: keyof GuestInfoForm;
  /** Field label for display */
  label: string;
  /** Field type for input */
  type: 'text' | 'email' | 'tel' | 'checkbox';
  /** Whether field is required */
  required: boolean;
  /** Validation pattern (regex string) */
  pattern?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Error message for invalid input */
  errorMessage?: string;
}

/**
 * Result of member resolution.
 */
export interface MemberResolutionResult {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Member profile (if authenticated) */
  member?: MemberProfile;
  /** Guest form fields (if not authenticated) */
  guestFormFields?: GuestFormField[];
  /** Error message (if resolution failed) */
  error?: string;
  /** Error code (if resolution failed) */
  errorCode?: ShopbyWidgetErrorCode;
}

/**
 * Default guest form fields configuration.
 */
const DEFAULT_GUEST_FORM_FIELDS: GuestFormField[] = [
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your name',
    errorMessage: 'Name is required',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    placeholder: 'Enter your email',
    errorMessage: 'Please enter a valid email address',
  },
  {
    name: 'phone',
    label: 'Phone Number',
    type: 'tel',
    required: true,
    pattern: '^[0-9-+]+$',
    placeholder: 'Enter your phone number',
    errorMessage: 'Please enter a valid phone number',
  },
  {
    name: 'smsNotification',
    label: 'Receive SMS notifications',
    type: 'checkbox',
    required: false,
  },
  {
    name: 'emailNotification',
    label: 'Receive email notifications',
    type: 'checkbox',
    required: false,
  },
];

/**
 * Resolves member information and handles guest user scenarios.
 *
 * Provides a unified interface for:
 * - Checking authentication state
 * - Fetching member profile data
 * - Providing guest form configuration
 *
 * @example
 * ```typescript
 * const resolver = new MemberResolver(authConnector);
 *
 * // Resolve member state
 * const result = await resolver.resolveMember();
 *
 * if (result.isAuthenticated && result.member) {
 *   console.log('Member:', result.member.memberName);
 *   console.log('Available points:', result.member.availablePoint);
 * } else {
 *   // Show guest form
 *   const formFields = resolver.getGuestForm();
 * }
 * ```
 */
export class MemberResolver {
  private auth: ShopbyAuthConnector;
  private apiBaseUrl: string;
  private cachedProfile: MemberProfile | null = null;
  private profileCacheExpiry: number = 0;

  /** Profile cache duration in ms (5 minutes) */
  private static readonly CACHE_DURATION_MS = 5 * 60 * 1000;

  constructor(auth: ShopbyAuthConnector, apiBaseUrl?: string) {
    this.auth = auth;
    this.apiBaseUrl = apiBaseUrl ?? DEFAULT_API_BASE;
  }

  /**
   * Resolve member information based on authentication state.
   *
   * If authenticated, fetches member profile from Shopby.
   * If not authenticated, returns guest form fields.
   *
   * @MX:ANCHOR: Member resolution entry - determines user context for orders
   * @returns MemberResolutionResult with profile or guest form
   */
  async resolveMember(): Promise<MemberResolutionResult> {
    if (!this.auth.isAuthenticated()) {
      return {
        isAuthenticated: false,
        guestFormFields: this.getGuestForm(),
      };
    }

    // Check cache first
    if (this.cachedProfile && Date.now() < this.profileCacheExpiry) {
      return {
        isAuthenticated: true,
        member: this.cachedProfile,
      };
    }

    try {
      const member = await this.fetchMemberInfo();
      this.cachedProfile = member;
      this.profileCacheExpiry = Date.now() + MemberResolver.CACHE_DURATION_MS;

      // Update auth connector with member grade
      if (member.memberGrade) {
        this.auth.setMemberGrade(member.memberGrade);
      }

      return {
        isAuthenticated: true,
        member,
      };
    } catch (err) {
      const error = this.classifyError(err);

      // If auth expired, return guest form
      if (error.code === ShopbyWidgetErrorCode.AUTH_EXPIRED) {
        this.auth.clear();
        return {
          isAuthenticated: false,
          guestFormFields: this.getGuestForm(),
        };
      }

      return {
        isAuthenticated: this.auth.isAuthenticated(),
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  /**
   * Fetch member profile information from Shopby.
   * @MX:NOTE: Profile is cached for 5 minutes to reduce API calls
   */
  async getMemberInfo(): Promise<{
    success: boolean;
    member?: MemberProfile;
    error?: string;
  }> {
    if (!this.auth.isAuthenticated()) {
      return {
        success: false,
        error: 'User is not authenticated',
      };
    }

    // Check cache
    if (this.cachedProfile && Date.now() < this.profileCacheExpiry) {
      return {
        success: true,
        member: this.cachedProfile,
      };
    }

    try {
      const member = await this.fetchMemberInfo();
      this.cachedProfile = member;
      this.profileCacheExpiry = Date.now() + MemberResolver.CACHE_DURATION_MS;

      return {
        success: true,
        member,
      };
    } catch (err) {
      const error = this.classifyError(err);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get guest form field configuration.
   * Used for rendering guest checkout forms.
   */
  getGuestForm(): GuestFormField[] {
    return [...DEFAULT_GUEST_FORM_FIELDS];
  }

  /**
   * Validate guest form data.
   * Returns validation errors or null if valid.
   */
  validateGuestForm(data: Partial<GuestInfoForm>): {
    valid: boolean;
    errors: Array<{ field: keyof GuestInfoForm; message: string }>;
  } {
    const errors: Array<{ field: keyof GuestInfoForm; message: string }> = [];

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    // Email validation
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Phone validation
    if (!data.phone || !this.isValidPhone(data.phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if user can proceed with order.
   * Returns true if authenticated or guest form is complete.
   */
  async canProceedWithOrder(guestData?: Partial<GuestInfoForm>): Promise<{
    canProceed: boolean;
    reason?: string;
  }> {
    if (this.auth.isAuthenticated()) {
      const result = await this.resolveMember();
      if (result.error) {
        return { canProceed: false, reason: result.error };
      }
      return { canProceed: true };
    }

    // Guest user - need valid guest data
    if (!guestData) {
      return { canProceed: false, reason: 'Guest information is required' };
    }

    const validation = this.validateGuestForm(guestData);
    if (!validation.valid) {
      return {
        canProceed: false,
        reason: validation.errors.map((e) => e.message).join(', '),
      };
    }

    return { canProceed: true };
  }

  /**
   * Clear cached member profile.
   * Call this after logout or profile update.
   */
  clearCache(): void {
    this.cachedProfile = null;
    this.profileCacheExpiry = 0;
  }

  /**
   * Fetch member info from Shopby API.
   */
  private async fetchMemberInfo(): Promise<MemberProfile> {
    const response = await fetch(`${this.apiBaseUrl}/members/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.auth.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw {
        status: response.status,
        statusText: response.statusText,
        body,
      };
    }

    const data = (await response.json()) as {
      memberId: string;
      memberName: string;
      email: string;
      phoneNumber?: string;
      memberGrade: string;
      availablePoint: number;
      orderCount: number;
      emailVerified: boolean;
      joinedAt?: string;
      lastLoginAt?: string;
    };

    return {
      memberId: data.memberId,
      memberName: data.memberName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      memberGrade: data.memberGrade,
      availablePoint: data.availablePoint ?? 0,
      orderCount: data.orderCount ?? 0,
      emailVerified: data.emailVerified ?? false,
      joinedAt: data.joinedAt,
      lastLoginAt: data.lastLoginAt,
    };
  }

  /**
   * Validate email format.
   */
  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * Validate phone number format.
   */
  private isValidPhone(phone: string): boolean {
    // Allow digits, hyphens, and plus sign
    const phonePattern = /^[0-9\-+]+$/;
    return phonePattern.test(phone.replace(/\s/g, ''));
  }

  /**
   * Classify an error into a ShopbyWidgetError.
   */
  private classifyError(err: unknown): ShopbyWidgetError {
    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err
    ) {
      const httpErr = err as { status: number; statusText?: string; body?: string };

      if (httpErr.status === 401 || httpErr.status === 403) {
        return {
          code: ShopbyWidgetErrorCode.AUTH_EXPIRED,
          message: 'Authentication expired or insufficient permissions',
          cause: err,
        };
      }

      if (httpErr.status === 404) {
        return {
          code: ShopbyWidgetErrorCode.PRODUCT_NOT_FOUND,
          message: 'Member profile not found',
          cause: err,
        };
      }

      return {
        code: ShopbyWidgetErrorCode.API_ERROR,
        message: `Shopby API error: ${httpErr.status} ${httpErr.statusText ?? ''}`.trim(),
        cause: err,
      };
    }

    if (err instanceof TypeError) {
      return {
        code: ShopbyWidgetErrorCode.NETWORK_ERROR,
        message: 'Network error: unable to reach Shopby API',
        cause: err,
      };
    }

    return {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: err instanceof Error ? err.message : 'Unknown error occurred',
      cause: err,
    };
  }
}

/**
 * Create a guest info form with custom configuration.
 * Utility for customizing guest form fields.
 */
export function createGuestForm(
  overrides?: Partial<GuestFormField>[],
): GuestFormField[] {
  const form = [...DEFAULT_GUEST_FORM_FIELDS];

  if (!overrides) {
    return form;
  }

  for (const override of overrides) {
    const index = form.findIndex((f) => f.name === override.name);
    if (index >= 0) {
      form[index] = { ...form[index], ...override };
    }
  }

  return form;
}
