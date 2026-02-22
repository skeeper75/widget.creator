import { eq, and, min, max } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import {
  products,
  fixedPrices,
  packagePrices,
  priceTiers,
} from '@widget-creator/shared/db/schema';
import { QuotePreviewRequestSchema } from '@/api/_lib/schemas/pricing';
import type { QuotePreviewRequestInput } from '@/api/_lib/schemas/pricing';
import { ApiError } from '@/api/_lib/middleware/error-handler';
import { toSnakeCase } from '@/api/_lib/utils/transform';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

const ERROR_BASE_URL = 'https://widget.huni.co.kr/errors';

export const POST = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(QuotePreviewRequestSchema, 'body'),
)(async (_req, ctx) => {
  const input = ctx.validatedBody as QuotePreviewRequestInput;

  // Load product
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.product_id), eq(products.isActive, true)));

  if (!product) {
    throw new ApiError(
      `${ERROR_BASE_URL}/not-found`,
      'Not Found',
      404,
      `Product ${input.product_id} not found`,
    );
  }

  // Determine which options are missing
  const missingOptions: string[] = [];
  if (!input.size_id) missingOptions.push('size_id');
  if (!input.paper_id) missingOptions.push('paper_id');
  if (!input.print_mode_id) missingOptions.push('print_mode_id');
  if (!input.page_count) missingOptions.push('page_count');
  if (!input.binding_id) missingOptions.push('binding_id');

  // Estimate price range based on pricing model
  let minPrice = 0;
  let maxPrice = 0;

  const pricingModel = product.pricingModel;

  if (pricingModel === 'fixed_unit' || pricingModel === 'fixed_size' || pricingModel === 'fixed_per_unit') {
    const conditions = [
      eq(fixedPrices.productId, input.product_id),
      eq(fixedPrices.isActive, true),
    ];

    const [priceRange] = await db
      .select({
        minPrice: min(fixedPrices.sellingPrice),
        maxPrice: max(fixedPrices.sellingPrice),
      })
      .from(fixedPrices)
      .where(and(...conditions));

    minPrice = Number(priceRange.minPrice ?? 0) * input.quantity;
    maxPrice = Number(priceRange.maxPrice ?? 0) * input.quantity;
  } else if (pricingModel === 'package') {
    const [priceRange] = await db
      .select({
        minPrice: min(packagePrices.sellingPrice),
        maxPrice: max(packagePrices.sellingPrice),
      })
      .from(packagePrices)
      .where(
        and(
          eq(packagePrices.productId, input.product_id),
          eq(packagePrices.isActive, true),
        ),
      );

    minPrice = Number(priceRange.minPrice ?? 0);
    maxPrice = Number(priceRange.maxPrice ?? 0);
  } else {
    // formula-based: estimate from price tiers
    const [tierRange] = await db
      .select({
        minPrice: min(priceTiers.unitPrice),
        maxPrice: max(priceTiers.unitPrice),
      })
      .from(priceTiers)
      .where(eq(priceTiers.isActive, true));

    minPrice = Number(tierRange.minPrice ?? 0) * input.quantity;
    maxPrice = Number(tierRange.maxPrice ?? 0) * input.quantity;
  }

  const response = {
    productId: input.product_id,
    quantity: input.quantity,
    priceRange: {
      min: Math.floor(minPrice),
      max: Math.ceil(maxPrice),
      currency: 'KRW',
    },
    isEstimate: missingOptions.length > 0,
    missingOptions,
  };

  return Response.json({ data: toSnakeCase(response) });
});
