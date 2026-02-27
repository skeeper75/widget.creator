import { z } from 'zod';

/**
 * Standard pagination + sorting query parameters.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Standard ID parameter for route params.
 */
export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type IdParam = z.infer<typeof IdParamSchema>;

/**
 * RFC 7807 Problem Detail schema.
 */
export const ProblemDetailSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string().optional(),
        code: z.string(),
        message: z.string(),
        received: z.unknown().optional(),
      }),
    )
    .optional(),
  trace_id: z.string().uuid().optional(),
});

export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;

/**
 * Standard search query parameter.
 */
export const SearchQuerySchema = z.object({
  search: z.string().max(200).optional(),
});

/**
 * Boolean coerce (handles "true"/"false" strings from query params).
 */
export const CoerceBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true';
  });
