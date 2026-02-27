import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { materials } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateMaterialSchema, UpdateMaterialSchema } from '@/lib/validations/schemas';

export const materialsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(materials).orderBy(asc(materials.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(materials).where(eq(materials.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateMaterialSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(materials).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateMaterialSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(materials)
        .set(input.data)
        .where(eq(materials.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(materials)
        .set({ isActive: false })
        .where(eq(materials.id, input.id))
        .returning();
      return row;
    }),
});
