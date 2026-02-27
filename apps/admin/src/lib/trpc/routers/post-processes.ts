import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { postProcesses } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreatePostProcessSchema, UpdatePostProcessSchema } from '@/lib/validations/schemas';

export const postProcessesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(postProcesses)
      .orderBy(asc(postProcesses.groupCode), asc(postProcesses.displayOrder));
  }),

  listGrouped: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(postProcesses)
      .orderBy(asc(postProcesses.groupCode), asc(postProcesses.displayOrder));

    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.groupCode]) {
        grouped[row.groupCode] = [];
      }
      grouped[row.groupCode].push(row);
    }
    return grouped;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(postProcesses).where(eq(postProcesses.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreatePostProcessSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(postProcesses).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdatePostProcessSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(postProcesses)
        .set(input.data)
        .where(eq(postProcesses.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(postProcesses)
        .set({ isActive: false })
        .where(eq(postProcesses.id, input.id))
        .returning();
      return row;
    }),
});
