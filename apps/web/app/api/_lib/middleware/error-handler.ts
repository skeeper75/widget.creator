import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const ERROR_BASE_URL = 'https://widget.huni.co.kr/errors';

export interface ValidationErrorDetail {
  field?: string;
  code: string;
  message: string;
  received?: unknown;
}

/**
 * Structured API error conforming to RFC 7807 Problem Details.
 */
export class ApiError extends Error {
  public readonly traceId: string;

  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail: string,
    public readonly errors?: ValidationErrorDetail[],
  ) {
    super(detail);
    this.name = 'ApiError';
    this.traceId = crypto.randomUUID();
  }
}

// Factory functions for common error types

export function notFound(resource: string, id: unknown): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/not-found`,
    'Not Found',
    404,
    `${resource} ${id} not found`,
  );
}

export function validationError(errors: ValidationErrorDetail[]): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/validation`,
    'Validation Error',
    422,
    `Request validation failed: ${errors.length} error${errors.length === 1 ? '' : 's'}`,
    errors,
  );
}

export function unauthorized(detail = 'Authentication required'): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/unauthorized`,
    'Unauthorized',
    401,
    detail,
  );
}

export function forbidden(detail = 'Insufficient permissions'): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/forbidden`,
    'Forbidden',
    403,
    detail,
  );
}

export function conflict(detail: string): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/conflict`,
    'Conflict',
    409,
    detail,
  );
}

export function invalidStateTransition(from: string, to: string): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/invalid-state-transition`,
    'Invalid State Transition',
    409,
    `Cannot transition from '${from}' to '${to}'`,
  );
}

export function rateLimitExceeded(limit: number, window: string, retryAfter: number): ApiError {
  const error = new ApiError(
    `${ERROR_BASE_URL}/rate-limit`,
    'Rate Limit Exceeded',
    429,
    `Rate limit of ${limit} req/${window} exceeded`,
  );
  (error as ApiError & { retryAfter: number }).retryAfter = retryAfter;
  return error;
}

export function internalError(detail = 'An unexpected error occurred'): ApiError {
  return new ApiError(
    `${ERROR_BASE_URL}/internal`,
    'Internal Server Error',
    500,
    detail,
  );
}

/**
 * Convert a ZodError to an array of ValidationErrorDetail.
 */
function zodErrorToDetails(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    code: issue.code,
    message: issue.message,
    received: 'received' in issue ? (issue as { received?: unknown }).received : undefined,
  }));
}

/**
 * Convert any error to an RFC 7807 NextResponse.
 * Catches ApiError, ZodError, and unknown errors.
 */
export function handleError(error: unknown, instance: string): NextResponse {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      instance,
      trace_id: error.traceId,
    };
    if (error.errors) {
      body.errors = error.errors;
    }
    if ('retryAfter' in error) {
      body.retry_after = (error as ApiError & { retryAfter: number }).retryAfter;
    }

    const level = error.status >= 500 ? 'error' : 'warn';
    console[level](`[${error.traceId}] ${error.status} ${error.title}: ${error.detail}`);

    return NextResponse.json(body, {
      status: error.status,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }

  if (error instanceof ZodError) {
    const apiErr = validationError(zodErrorToDetails(error));
    return handleError(apiErr, instance);
  }

  // Unknown error
  const apiErr = internalError();
  console.error(`[${apiErr.traceId}] Unhandled error:`, error);
  return handleError(apiErr, instance);
}
