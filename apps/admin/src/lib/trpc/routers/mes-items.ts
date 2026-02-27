import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { mesItems, mesItemOptions } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';

export const mesItemsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(mesItems)
      .orderBy(asc(mesItems.groupCode), asc(mesItems.id));
  }),

  getWithOptions: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(mesItems)
        .where(eq(mesItems.id, input.id));

      if (!item) return null;

      const options = await ctx.db
        .select()
        .from(mesItemOptions)
        .where(eq(mesItemOptions.mesItemId, input.id))
        .orderBy(asc(mesItemOptions.optionNumber));

      return { ...item, options };
    }),
});
