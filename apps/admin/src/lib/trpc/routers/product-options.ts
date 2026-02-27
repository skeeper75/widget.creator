import { z } from 'zod';
import { eq, asc, and } from 'drizzle-orm';
import { productOptions, optionDefinitions, optionChoices } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateProductOptionSchema, UpdateProductOptionSchema } from '@/lib/validations/schemas';

export const productOptionsRouter = router({
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          productOption: productOptions,
          definition: optionDefinitions,
        })
        .from(productOptions)
        .leftJoin(optionDefinitions, eq(productOptions.optionDefinitionId, optionDefinitions.id))
        .where(eq(productOptions.productId, input.productId))
        .orderBy(asc(productOptions.displayOrder), asc(productOptions.id));

      return rows.map((r) => ({
        ...r.productOption,
        definition: r.definition,
      }));
    }),

  assignToProduct: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        optionDefinitionId: z.number(),
        displayOrder: z.number().default(0),
        isRequired: z.boolean().default(false),
        isVisible: z.boolean().default(true),
        isInternal: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(productOptions)
        .values(input)
        .onConflictDoNothing()
        .returning();
      return row ?? null;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateProductOptionSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productOptions)
        .set(input.data)
        .where(eq(productOptions.id, input.id))
        .returning();
      return row;
    }),

  softDeleteChoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productOptions)
        .set({ isActive: false })
        .where(eq(productOptions.id, input.id))
        .returning();
      return row;
    }),

  reorder: protectedProcedure
    .input(z.array(z.object({ id: z.number(), displayOrder: z.number() })))
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((item) =>
          ctx.db
            .update(productOptions)
            .set({ displayOrder: item.displayOrder })
            .where(eq(productOptions.id, item.id))
            .returning(),
        ),
      );
      return results.flat();
    }),
});
