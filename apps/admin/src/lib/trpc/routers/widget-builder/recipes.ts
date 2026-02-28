import { z } from 'zod';
import { eq as _eq, asc as _asc, desc as _desc, and as _and, inArray as _inArray } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asc = _asc as (col: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const desc = _desc as (col: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inArray = _inArray as (col: AnyArg, vals: AnyArg) => any;
import { TRPCError } from '@trpc/server';
import {
  productRecipes,
  recipeOptionBindings,
  recipeChoiceRestrictions,
  optionElementTypes,
} from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// @MX:NOTE: [AUTO] restrictionMode enum mirrors DB CHECK constraint on recipe_choice_restrictions
const RestrictionModeEnum = z.enum(['allow_only', 'exclude']);

const CreateRecipeSchema = z.object({
  productId: z.number().int().positive(),
  recipeName: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  description: z.string().nullable().optional(),
});

const ArchiveAndCreateSchema = z.object({
  recipeId: z.number().int().positive(),
  recipeName: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  description: z.string().nullable().optional(),
});

const AddBindingSchema = z.object({
  recipeId: z.number().int().positive(),
  typeId: z.number().int().positive(),
  displayOrder: z.number().int().min(0).default(0),
  processingOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  defaultChoiceId: z.number().int().positive().nullable().optional(),
});

const UpdateBindingOrderSchema = z.object({
  recipeId: z.number().int().positive(),
  bindings: z
    .array(
      z.object({
        id: z.number().int().positive(),
        displayOrder: z.number().int().min(0),
        processingOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

const SetChoiceRestrictionsSchema = z.object({
  bindingId: z.number().int().positive(),
  choiceIds: z.array(z.number().int().positive()),
  mode: RestrictionModeEnum,
});

// @MX:ANCHOR: [AUTO] recipesRouter — core router for Recipe Builder CRUD
// @MX:REASON: Fan_in >= 3: used by index router, recipes page, element-binding-table, and choice-restriction-matrix
export const recipesRouter = router({
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(productRecipes)
        .where(eq(productRecipes.productId, input.productId))
        .orderBy(desc(productRecipes.recipeVersion));
    }),

  getWithBindings: protectedProcedure
    .input(z.object({ recipeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db
        .select()
        .from(productRecipes)
        .where(eq(productRecipes.id, input.recipeId))
        .then((rows) => rows[0]);

      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }

      const bindings = await ctx.db
        .select({
          id: recipeOptionBindings.id,
          recipeId: recipeOptionBindings.recipeId,
          typeId: recipeOptionBindings.typeId,
          displayOrder: recipeOptionBindings.displayOrder,
          processingOrder: recipeOptionBindings.processingOrder,
          isRequired: recipeOptionBindings.isRequired,
          defaultChoiceId: recipeOptionBindings.defaultChoiceId,
          isActive: recipeOptionBindings.isActive,
          typeName: optionElementTypes.typeNameKo,
          typeNameEn: optionElementTypes.typeNameEn,
          typeKey: optionElementTypes.typeKey,
          uiControl: optionElementTypes.uiControl,
        })
        .from(recipeOptionBindings)
        .innerJoin(optionElementTypes, eq(recipeOptionBindings.typeId, optionElementTypes.id))
        .where(
          and(
            eq(recipeOptionBindings.recipeId, input.recipeId),
            eq(recipeOptionBindings.isActive, true),
          ),
        )
        .orderBy(asc(recipeOptionBindings.displayOrder));

      const bindingIds = bindings.map((b) => b.id);
      const restrictions =
        bindingIds.length > 0
          ? await ctx.db
              .select()
              .from(recipeChoiceRestrictions)
              .where(inArray(recipeChoiceRestrictions.recipeBindingId, bindingIds))
          : [];

      const bindingsWithRestrictions = bindings.map((binding) => ({
        ...binding,
        restrictions: restrictions.filter((r) => r.recipeBindingId === binding.id),
      }));

      return { ...recipe, bindings: bindingsWithRestrictions };
    }),

  create: protectedProcedure
    .input(CreateRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(productRecipes)
        .values({
          productId: input.productId,
          recipeName: input.recipeName,
          recipeVersion: 1,
          isDefault: input.isDefault,
          isArchived: false,
          description: input.description ?? null,
        })
        .returning();
      return row;
    }),

  // @MX:NOTE: [AUTO] archiveAndCreate uses transaction to ensure atomicity
  // @MX:WARN: [AUTO] Recipe hard delete prohibited (NFR-WBADMIN-002)
  // @MX:REASON: Existing orders reference recipe versions — hard delete corrupts order history
  archiveAndCreate: protectedProcedure
    .input(ArchiveAndCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // Step 1: fetch the old recipe
        const [oldRecipe] = await tx
          .select()
          .from(productRecipes)
          .where(eq(productRecipes.id, input.recipeId));

        if (!oldRecipe) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
        }

        // Step 2: archive the old recipe
        await tx
          .update(productRecipes)
          .set({ isArchived: true, updatedAt: new Date() })
          .where(eq(productRecipes.id, input.recipeId));

        // Step 3: create new recipe with version + 1
        const [newRecipe] = await tx
          .insert(productRecipes)
          .values({
            productId: oldRecipe.productId,
            recipeName: input.recipeName,
            recipeVersion: oldRecipe.recipeVersion + 1,
            isDefault: input.isDefault,
            isArchived: false,
            description: input.description ?? null,
          })
          .returning();

        // Step 4: copy all active bindings from old recipe
        const oldBindings = await tx
          .select()
          .from(recipeOptionBindings)
          .where(
            and(
              eq(recipeOptionBindings.recipeId, input.recipeId),
              eq(recipeOptionBindings.isActive, true),
            ),
          );

        if (oldBindings.length === 0) {
          return newRecipe;
        }

        const newBindings = await tx
          .insert(recipeOptionBindings)
          .values(
            oldBindings.map((b) => ({
              recipeId: newRecipe.id,
              typeId: b.typeId,
              displayOrder: b.displayOrder,
              processingOrder: b.processingOrder,
              isRequired: b.isRequired,
              defaultChoiceId: b.defaultChoiceId,
              isActive: true,
            })),
          )
          .returning();

        // Step 5: copy restrictions for each binding
        const oldBindingIds = oldBindings.map((b) => b.id);
        const oldRestrictions = await tx
          .select()
          .from(recipeChoiceRestrictions)
          .where(inArray(recipeChoiceRestrictions.recipeBindingId, oldBindingIds));

        if (oldRestrictions.length > 0) {
          // Map old binding id -> new binding id
          const bindingIdMap = new Map<number, number>();
          oldBindings.forEach((oldB, idx) => {
            bindingIdMap.set(oldB.id, newBindings[idx].id);
          });

          await tx.insert(recipeChoiceRestrictions).values(
            oldRestrictions.map((r) => ({
              recipeBindingId: bindingIdMap.get(r.recipeBindingId)!,
              choiceId: r.choiceId,
              restrictionMode: r.restrictionMode,
            })),
          );
        }

        return newRecipe;
      });
    }),

  addBinding: protectedProcedure
    .input(AddBindingSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify recipe exists
      const [recipe] = await ctx.db
        .select({ id: productRecipes.id })
        .from(productRecipes)
        .where(eq(productRecipes.id, input.recipeId));

      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }

      const [row] = await ctx.db
        .insert(recipeOptionBindings)
        .values({
          recipeId: input.recipeId,
          typeId: input.typeId,
          displayOrder: input.displayOrder,
          processingOrder: input.processingOrder,
          isRequired: input.isRequired,
          defaultChoiceId: input.defaultChoiceId ?? null,
          isActive: true,
        })
        .returning();

      return row;
    }),

  updateBindingOrder: protectedProcedure
    .input(UpdateBindingOrderSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const binding of input.bindings) {
          await tx
            .update(recipeOptionBindings)
            .set({
              displayOrder: binding.displayOrder,
              processingOrder: binding.processingOrder,
            })
            .where(
              and(
                eq(recipeOptionBindings.id, binding.id),
                eq(recipeOptionBindings.recipeId, input.recipeId),
              ),
            );
        }
      });
      return { success: true };
    }),

  removeBinding: protectedProcedure
    .input(z.object({ bindingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(recipeOptionBindings)
        .set({ isActive: false })
        .where(eq(recipeOptionBindings.id, input.bindingId))
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Binding not found' });
      }
      return row;
    }),

  // @MX:NOTE: [AUTO] setChoiceRestrictions replaces all restrictions for a binding atomically
  setChoiceRestrictions: protectedProcedure
    .input(SetChoiceRestrictionsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        // Delete all existing restrictions for this binding
        await tx
          .delete(recipeChoiceRestrictions)
          .where(eq(recipeChoiceRestrictions.recipeBindingId, input.bindingId));

        // Insert new restrictions (empty choiceIds = clear all)
        if (input.choiceIds.length > 0) {
          await tx.insert(recipeChoiceRestrictions).values(
            input.choiceIds.map((choiceId) => ({
              recipeBindingId: input.bindingId,
              choiceId,
              restrictionMode: input.mode,
            })),
          );
        }
      });
      return { success: true };
    }),
});
