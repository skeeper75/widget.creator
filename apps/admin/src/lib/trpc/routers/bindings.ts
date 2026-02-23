import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { bindings } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { UpdateBindingSchema } from '@/lib/validations/schemas';
import { createInsertSchema } from 'drizzle-zod';

// Use raw insert schema for mutation input (refine is not compatible with .input())
const CreateBindingInput = createInsertSchema(bindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const bindingsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(bindings)
      .orderBy(asc(bindings.displayOrder), asc(bindings.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(bindings).where(eq(bindings.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateBindingInput)
    .mutation(async ({ ctx, input }) => {
      // REQ-E-303: Validate page range
      if (input.minPages != null && input.maxPages != null && input.minPages >= input.maxPages) {
        throw new Error('minPages must be less than maxPages');
      }
      if (input.pageStep != null && input.pageStep <= 0) {
        throw new Error('pageStep must be greater than 0');
      }
      const [row] = await ctx.db.insert(bindings).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateBindingSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(bindings)
        .set(input.data)
        .where(eq(bindings.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(bindings)
        .set({ isActive: false })
        .where(eq(bindings.id, input.id))
        .returning();
      return row;
    }),
});
