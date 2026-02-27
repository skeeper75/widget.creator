import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { lossQuantityConfigs } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { UpdateLossQuantityConfigSchema } from '@/lib/validations/schemas';

export const lossQuantityConfigsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(lossQuantityConfigs)
      .orderBy(asc(lossQuantityConfigs.scopeType), asc(lossQuantityConfigs.id));
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateLossQuantityConfigSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(lossQuantityConfigs)
        .set(input.data)
        .where(eq(lossQuantityConfigs.id, input.id))
        .returning();
      return row;
    }),
});
