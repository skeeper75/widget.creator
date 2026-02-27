import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { widgets } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateWidgetSchema, UpdateWidgetSchema } from '@/lib/validations/schemas';
import crypto from 'crypto';

export const widgetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(widgets).orderBy(asc(widgets.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(widgets).where(eq(widgets.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateWidgetSchema)
    .mutation(async ({ ctx, input }) => {
      const values = {
        ...input,
        widgetId: input.widgetId ?? crypto.randomUUID().slice(0, 8),
      };
      const [row] = await ctx.db.insert(widgets).values(values).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateWidgetSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(widgets)
        .set(input.data)
        .where(eq(widgets.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(widgets)
        .set({ isActive: false })
        .where(eq(widgets.id, input.id))
        .returning();
      return row;
    }),

  generateEmbedCode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [widget] = await ctx.db
        .select()
        .from(widgets)
        .where(eq(widgets.id, input.id));

      if (!widget) throw new Error('Widget not found');

      const baseUrl = widget.apiBaseUrl ?? 'https://widget.huniprinting.com';
      const embedCode = `<script src="${baseUrl}/embed.js" data-widget-id="${widget.widgetId}"></script>`;

      return { embedCode, widgetId: widget.widgetId };
    }),
});
