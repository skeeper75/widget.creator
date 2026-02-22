import { eq, and, asc } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import {
  products,
  priceTables,
  priceTiers,
} from '@widget-creator/shared/db/schema';
import { PriceTierQuerySchema } from '@/api/_lib/schemas/pricing';
import type { PriceTierQueryInput } from '@/api/_lib/schemas/pricing';
import { notFound } from '@/api/_lib/middleware/error-handler';
import { toSnakeCase } from '@/api/_lib/utils/transform';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(PriceTierQuerySchema, 'query'),
)(async (_req, ctx) => {
  const id = Number(ctx.params.id);
  const query = ctx.validatedQuery as PriceTierQueryInput;

  // Verify product exists
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id));

  if (!product) {
    throw notFound('Product', id);
  }

  // Fetch price tables
  const tableConditions = [eq(priceTables.isActive, true)];
  if (query.price_table_id !== undefined) {
    tableConditions.push(eq(priceTables.id, query.price_table_id));
  }

  const tables = await db
    .select()
    .from(priceTables)
    .where(and(...tableConditions));

  // Fetch tiers for these tables
  const tableIds = tables.map((t) => t.id);
  if (tableIds.length === 0) {
    return Response.json({ data: [] });
  }

  const tierConditions = [eq(priceTiers.isActive, true)];
  if (query.option_code !== undefined) {
    tierConditions.push(eq(priceTiers.optionCode, query.option_code));
  }

  const allTiers = await db
    .select()
    .from(priceTiers)
    .where(and(...tierConditions))
    .orderBy(asc(priceTiers.minQty));

  // Group tiers by price table
  const tiersByTable = new Map<number, typeof priceTiers.$inferSelect[]>();
  for (const tier of allTiers) {
    if (!tableIds.includes(tier.priceTableId)) continue;
    const existing = tiersByTable.get(tier.priceTableId) ?? [];
    existing.push(tier);
    tiersByTable.set(tier.priceTableId, existing);
  }

  const data = tables
    .filter((t) => (tiersByTable.get(t.id)?.length ?? 0) > 0)
    .map((t) => ({
      priceTable: {
        id: t.id,
        code: t.code,
        name: t.name,
        priceType: t.priceType,
        quantityBasis: t.quantityBasis,
      },
      tiers: (tiersByTable.get(t.id) ?? []).map((tier) => ({
        id: tier.id,
        optionCode: tier.optionCode,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        unitPrice: Number(tier.unitPrice),
      })),
    }));

  return Response.json({ data: toSnakeCase(data) });
});
