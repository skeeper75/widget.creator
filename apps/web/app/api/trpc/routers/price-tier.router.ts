import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { priceTiers } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router, protectedProcedure } from '../trpc.js';

const createPriceTierSchema = createInsertSchema(priceTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updatePriceTierSchema = createPriceTierSchema.partial();

const PriceTierRowSchema = z.object({
  optionCode: z.string().min(1).max(50),
  minQty: z.number().int().min(0),
  maxQty: z.number().int().min(1),
  unitPrice: z.string().or(z.number()).transform(String),
  isActive: z.boolean().default(true),
});

const crudRouter = createCrudRouter({
  table: priceTiers,
  createSchema: createPriceTierSchema,
  updateSchema: updatePriceTierSchema,
  defaultSort: 'optionCode',
});

export const priceTierRouter = router({
  ...crudRouter._def.procedures,

  /**
   * Bulk import price tiers for a specific price table.
   * Supports 'replace' (delete all existing, insert new) and 'merge' (upsert by optionCode+minQty).
   */
  import: protectedProcedure
    .input(
      z.object({
        price_table_id: z.number().int().positive(),
        data: z.array(PriceTierRowSchema).min(1),
        mode: z.enum(['replace', 'merge']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { price_table_id, data, mode } = input;

      if (mode === 'replace') {
        // Delete all existing tiers for this price table
        await ctx.db
          .delete(priceTiers)
          .where(eq(priceTiers.priceTableId, price_table_id));

        // Insert all new tiers
        const inserted = await ctx.db
          .insert(priceTiers)
          .values(
            data.map((row) => ({
              priceTableId: price_table_id,
              optionCode: row.optionCode,
              minQty: row.minQty,
              maxQty: row.maxQty,
              unitPrice: row.unitPrice,
              isActive: row.isActive,
            })),
          )
          .returning();

        return { mode: 'replace', imported: inserted.length, data: inserted };
      }

      // Merge mode: upsert by optionCode + minQty
      const results = [];
      for (const row of data) {
        const [existing] = await ctx.db
          .select()
          .from(priceTiers)
          .where(
            and(
              eq(priceTiers.priceTableId, price_table_id),
              eq(priceTiers.optionCode, row.optionCode),
              eq(priceTiers.minQty, row.minQty),
            ),
          );

        if (existing) {
          const [updated] = await ctx.db
            .update(priceTiers)
            .set({
              maxQty: row.maxQty,
              unitPrice: row.unitPrice,
              isActive: row.isActive,
            })
            .where(eq(priceTiers.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [created] = await ctx.db
            .insert(priceTiers)
            .values({
              priceTableId: price_table_id,
              optionCode: row.optionCode,
              minQty: row.minQty,
              maxQty: row.maxQty,
              unitPrice: row.unitPrice,
              isActive: row.isActive,
            })
            .returning();
          results.push(created);
        }
      }

      return { mode: 'merge', imported: results.length, data: results };
    }),

  /**
   * Export price tiers for a specific price table in JSON or CSV format.
   */
  export: protectedProcedure
    .input(
      z.object({
        price_table_id: z.number().int().positive(),
        format: z.enum(['json', 'csv']),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { price_table_id, format } = input;

      const tiers = await ctx.db
        .select()
        .from(priceTiers)
        .where(eq(priceTiers.priceTableId, price_table_id))
        .orderBy(priceTiers.optionCode, priceTiers.minQty);

      if (format === 'csv') {
        const header = 'option_code,min_qty,max_qty,unit_price,is_active';
        const rows = tiers.map(
          (t) =>
            `${t.optionCode},${t.minQty},${t.maxQty},${t.unitPrice},${t.isActive}`,
        );
        return {
          format: 'csv',
          content: [header, ...rows].join('\n'),
          count: tiers.length,
        };
      }

      return {
        format: 'json',
        content: tiers,
        count: tiers.length,
      };
    }),
});
