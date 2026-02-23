import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { optionChoiceMesMappings, optionChoices, mesItems } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { UpdateMappingStatusSchema } from '@/lib/validations/schemas';

export const optionChoiceMesMappingsRouter = router({
  listKanban: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: optionChoiceMesMappings.id,
        optionChoiceId: optionChoiceMesMappings.optionChoiceId,
        optionChoiceName: optionChoices.name,
        mesItemId: optionChoiceMesMappings.mesItemId,
        mesCode: optionChoiceMesMappings.mesCode,
        mappingType: optionChoiceMesMappings.mappingType,
        mappingStatus: optionChoiceMesMappings.mappingStatus,
        mappedBy: optionChoiceMesMappings.mappedBy,
        mappedAt: optionChoiceMesMappings.mappedAt,
        notes: optionChoiceMesMappings.notes,
        isActive: optionChoiceMesMappings.isActive,
      })
      .from(optionChoiceMesMappings)
      .leftJoin(optionChoices, eq(optionChoiceMesMappings.optionChoiceId, optionChoices.id))
      .orderBy(asc(optionChoiceMesMappings.id));

    // Group by status for kanban columns
    const kanban = {
      pending: rows.filter((r) => r.mappingStatus === 'pending'),
      mapped: rows.filter((r) => r.mappingStatus === 'mapped'),
      verified: rows.filter((r) => r.mappingStatus === 'verified'),
    };

    return kanban;
  }),

  updateStatus: protectedProcedure
    .input(UpdateMappingStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // REQ-C-003: Validate mesItemId exists when verifying
      if (input.mappingStatus === 'verified' && input.mesItemId) {
        const [mesItem] = await ctx.db
          .select({ id: mesItems.id })
          .from(mesItems)
          .where(eq(mesItems.id, input.mesItemId));

        if (!mesItem) {
          throw new Error('Invalid mesItemId: MES item does not exist');
        }
      }

      const updateData: Record<string, unknown> = {
        mappingStatus: input.mappingStatus,
      };

      if (input.mesItemId != null) updateData.mesItemId = input.mesItemId;
      if (input.mesCode != null) updateData.mesCode = input.mesCode;
      if (input.mappedBy != null) updateData.mappedBy = input.mappedBy;
      if (input.mappingStatus === 'verified' || input.mappingStatus === 'mapped') {
        updateData.mappedAt = new Date();
      }

      const [row] = await ctx.db
        .update(optionChoiceMesMappings)
        .set(updateData)
        .where(eq(optionChoiceMesMappings.id, input.id))
        .returning();
      return row;
    }),

  batchUpdateStatus: protectedProcedure
    .input(z.array(UpdateMappingStatusSchema))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const item of input) {
        const updateData: Record<string, unknown> = {
          mappingStatus: item.mappingStatus,
        };
        if (item.mesItemId != null) updateData.mesItemId = item.mesItemId;
        if (item.mesCode != null) updateData.mesCode = item.mesCode;
        if (item.mappedBy != null) updateData.mappedBy = item.mappedBy;
        if (item.mappingStatus === 'verified' || item.mappingStatus === 'mapped') {
          updateData.mappedAt = new Date();
        }

        const [row] = await ctx.db
          .update(optionChoiceMesMappings)
          .set(updateData)
          .where(eq(optionChoiceMesMappings.id, item.id))
          .returning();
        results.push(row);
      }
      return results;
    }),
});
