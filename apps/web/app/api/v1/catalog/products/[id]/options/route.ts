import { eq, and, asc } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import {
  productOptions,
  optionDefinitions,
  optionChoices,
} from '@widget-creator/shared/db/schema';
import { toSnakeCase } from '@/api/_lib/utils/transform';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
)(async (_req, ctx) => {
  const id = Number(ctx.params.id);

  // Fetch product options joined with their definitions
  const poRows = await db
    .select({
      po: productOptions,
      od: optionDefinitions,
    })
    .from(productOptions)
    .innerJoin(
      optionDefinitions,
      eq(productOptions.optionDefinitionId, optionDefinitions.id),
    )
    .where(
      and(
        eq(productOptions.productId, id),
        eq(productOptions.isActive, true),
        eq(optionDefinitions.isActive, true),
      ),
    )
    .orderBy(asc(productOptions.displayOrder));

  // Collect all option definition IDs to batch-fetch choices
  const definitionIds = poRows.map((r) => r.od.id);

  const choicesByDefinition = new Map<number, typeof optionChoices.$inferSelect[]>();

  if (definitionIds.length > 0) {
    const allChoices = await db
      .select()
      .from(optionChoices)
      .where(eq(optionChoices.isActive, true))
      .orderBy(asc(optionChoices.displayOrder));

    // Group choices by option definition ID
    for (const choice of allChoices) {
      if (!definitionIds.includes(choice.optionDefinitionId)) continue;
      const existing = choicesByDefinition.get(choice.optionDefinitionId) ?? [];
      existing.push(choice);
      choicesByDefinition.set(choice.optionDefinitionId, existing);
    }
  }

  const data = poRows.map(({ po, od }) => ({
    id: po.id,
    optionDefinition: {
      id: od.id,
      key: od.key,
      name: od.name,
      optionClass: od.optionClass,
      optionType: od.optionType,
      uiComponent: po.uiComponentOverride ?? od.uiComponent,
    },
    displayOrder: po.displayOrder,
    isRequired: po.isRequired,
    isVisible: po.isVisible,
    defaultChoiceId: po.defaultChoiceId,
    choices: (choicesByDefinition.get(od.id) ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      priceKey: c.priceKey,
      refPaperId: c.refPaperId,
      displayOrder: c.displayOrder,
    })),
  }));

  return Response.json({ data: toSnakeCase(data) });
});
