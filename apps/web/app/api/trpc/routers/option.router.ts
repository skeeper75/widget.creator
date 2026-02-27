import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import {
  optionDefinitions,
  productOptions,
  optionChoices,
} from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';

// Option Definitions CRUD
const createOptionDefSchema = createInsertSchema(optionDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateOptionDefSchema = createOptionDefSchema.partial();

const defCrudRouter = createCrudRouter({
  table: optionDefinitions,
  createSchema: createOptionDefSchema,
  updateSchema: updateOptionDefSchema,
  searchableColumns: ['name', 'key'],
  defaultSort: 'displayOrder',
});

// Option Choices schemas
const createChoiceSchema = createInsertSchema(optionChoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateChoiceSchema = createChoiceSchema.partial();

export const optionRouter = router({
  // Standard CRUD for optionDefinitions
  ...defCrudRouter._def.procedures,

  /**
   * Get option definition with all its choices.
   */
  getWithChoices: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const [definition] = await ctx.db
        .select()
        .from(optionDefinitions)
        .where(eq(optionDefinitions.id, input.id));

      if (!definition) {
        throw new Error(`Option definition with id ${input.id} not found`);
      }

      const choices = await ctx.db
        .select()
        .from(optionChoices)
        .where(eq(optionChoices.optionDefinitionId, input.id))
        .orderBy(optionChoices.displayOrder);

      return { ...definition, choices };
    }),

  /**
   * List product-specific option configurations for a given product.
   */
  listByProduct: publicProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const options = await ctx.db
        .select()
        .from(productOptions)
        .where(eq(productOptions.productId, input.productId))
        .orderBy(productOptions.displayOrder);

      return options;
    }),

  /**
   * Assign an option definition to a product.
   */
  assignToProduct: protectedProcedure
    .input(
      createInsertSchema(productOptions).omit({
        id: true,
        createdAt: true,
        updatedAt: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [created] = await ctx.db
        .insert(productOptions)
        .values(input)
        .returning();
      return created;
    }),

  /**
   * Update a product-option assignment.
   */
  updateProductOption: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: createInsertSchema(productOptions)
          .omit({ id: true, createdAt: true, updatedAt: true })
          .partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(productOptions)
        .set(input.data)
        .where(eq(productOptions.id, input.id))
        .returning();

      if (!updated) {
        throw new Error(`Product option with id ${input.id} not found`);
      }

      return updated;
    }),

  /**
   * Create an option choice for a given option definition.
   */
  createChoice: protectedProcedure
    .input(createChoiceSchema)
    .mutation(async ({ input, ctx }) => {
      const [created] = await ctx.db
        .insert(optionChoices)
        .values(input)
        .returning();
      return created;
    }),

  /**
   * Update an option choice.
   */
  updateChoice: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: updateChoiceSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(optionChoices)
        .set(input.data)
        .where(eq(optionChoices.id, input.id))
        .returning();

      if (!updated) {
        throw new Error(`Option choice with id ${input.id} not found`);
      }

      return updated;
    }),

  /**
   * Soft-delete an option choice.
   */
  softDeleteChoice: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const [deleted] = await ctx.db
        .update(optionChoices)
        .set({ isActive: false })
        .where(eq(optionChoices.id, input.id))
        .returning();

      if (!deleted) {
        throw new Error(`Option choice with id ${input.id} not found`);
      }

      return deleted;
    }),
});
