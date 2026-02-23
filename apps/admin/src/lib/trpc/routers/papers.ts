import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { papers } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreatePaperSchema, UpdatePaperSchema } from '@/lib/validations/schemas';

export const papersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(papers)
      .orderBy(asc(papers.displayOrder), asc(papers.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(papers).where(eq(papers.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreatePaperSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(papers).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdatePaperSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(papers)
        .set(input.data)
        .where(eq(papers.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // REQ-N-002: Soft delete for referenced master data
      const [row] = await ctx.db
        .update(papers)
        .set({ isActive: false })
        .where(eq(papers.id, input.id))
        .returning();
      return row;
    }),

  batchUpdatePrices: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          costPerRear: z.string().optional(),
          sellingPerRear: z.string().optional(),
          costPer4Cut: z.string().optional(),
          sellingPer4Cut: z.string().optional(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((item) => {
          const { id, ...data } = item;
          return ctx.db
            .update(papers)
            .set(data)
            .where(eq(papers.id, id))
            .returning();
        }),
      );
      return results.flat();
    }),
});
