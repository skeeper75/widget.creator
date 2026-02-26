import { z } from 'zod';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { TRPCError } from '@trpc/server';
import {
  wbProducts,
  productRecipes,
  recipeOptionBindings,
  optionElementChoices,
  productPriceConfigs,
  recipeConstraints,
  simulationRuns,
  simulationCases,
  publishHistory,
} from '@widget-creator/db';
import { router, protectedProcedure } from '../server';
import {
  checkCompleteness,
  cartesianProduct,
  resolveSimulationCombinations,
  runSimulationCases,
  validatePublishReadiness,
  PublishError,
} from '@widget-creator/core';
import type { CompletenessInput, SimulationCaseResult } from '@widget-creator/core';

// Drizzle DB type that can query any table (runtime DB is schema-agnostic)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PostgresJsDatabase<any>;

// @MX:NOTE: [AUTO] fetchCompletenessInput — assembles CompletenessInput from 5 DB queries; called by completeness, publish, dashboard
// @MX:SPEC: SPEC-WB-005 FR-WB005-01
// Helper: build CompletenessInput from DB queries
async function fetchCompletenessInput(db: AnyDb, productId: number): Promise<CompletenessInput> {
  const [product] = await db
    .select({
      edicusCode: wbProducts.edicusCode,
      mesItemCd: wbProducts.mesItemCd,
    })
    .from(wbProducts)
    .where(eq(wbProducts.id, productId));

  if (!product) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
  }

  const [defaultRecipe] = await db
    .select({ id: productRecipes.id })
    .from(productRecipes)
    .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isDefault, true)));

  const hasDefaultRecipe = defaultRecipe !== undefined;
  let optionTypeCount = 0;
  let minChoiceCount = 0;
  let hasRequiredOption = false;
  let constraintCount = 0;

  if (hasDefaultRecipe && defaultRecipe) {
    const recipeId = defaultRecipe.id;

    const bindings = await db
      .select({
        typeId: recipeOptionBindings.typeId,
        isRequired: recipeOptionBindings.isRequired,
      })
      .from(recipeOptionBindings)
      .where(and(
        eq(recipeOptionBindings.recipeId, recipeId),
        eq(recipeOptionBindings.isActive, true),
      ));

    optionTypeCount = bindings.length;
    hasRequiredOption = bindings.some((b: { isRequired: boolean }) => b.isRequired);

    if (bindings.length > 0) {
      const choiceCounts = await Promise.all(
        bindings.map(async (b: { typeId: number }) => {
          const [result] = await db
            .select({ cnt: count() })
            .from(optionElementChoices)
            .where(and(
              eq(optionElementChoices.typeId, b.typeId),
              eq(optionElementChoices.isActive, true),
            ));
          return Number(result?.cnt ?? 0);
        }),
      );
      minChoiceCount = choiceCounts.length > 0 ? Math.min(...choiceCounts) : 0;
    }

    const [constraintResult] = await db
      .select({ cnt: count() })
      .from(recipeConstraints)
      .where(eq(recipeConstraints.recipeId, recipeId));
    constraintCount = Number(constraintResult?.cnt ?? 0);
  }

  const [pricingConfig] = await db
    .select({ isActive: productPriceConfigs.isActive })
    .from(productPriceConfigs)
    .where(eq(productPriceConfigs.productId, productId));

  return {
    hasDefaultRecipe,
    optionTypeCount,
    minChoiceCount,
    hasRequiredOption,
    hasPricingConfig: pricingConfig !== undefined,
    isPricingActive: pricingConfig?.isActive ?? false,
    constraintCount,
    edicusCode: product.edicusCode ?? null,
    mesItemCd: product.mesItemCd ?? null,
  };
}

// Helper: fetch all active option choice sets for a product's default recipe
async function fetchOptionChoiceSets(
  db: AnyDb,
  productId: number,
): Promise<{ typeKey: string; choices: string[] }[]> {
  const [defaultRecipe] = await db
    .select({ id: productRecipes.id })
    .from(productRecipes)
    .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isDefault, true)));

  if (!defaultRecipe) return [];

  const bindings = await db
    .select({
      typeId: recipeOptionBindings.typeId,
      typeKey: sql<string>`(SELECT type_key FROM option_element_types WHERE id = ${recipeOptionBindings.typeId})`,
    })
    .from(recipeOptionBindings)
    .where(and(
      eq(recipeOptionBindings.recipeId, defaultRecipe.id),
      eq(recipeOptionBindings.isActive, true),
    ))
    .orderBy(asc(recipeOptionBindings.displayOrder));

  const result: { typeKey: string; choices: string[] }[] = [];

  for (const binding of bindings) {
    const choices = await db
      .select({ choiceKey: optionElementChoices.choiceKey })
      .from(optionElementChoices)
      .where(and(
        eq(optionElementChoices.typeId, binding.typeId),
        eq(optionElementChoices.isActive, true),
      ))
      .orderBy(asc(optionElementChoices.displayOrder));

    if (choices.length > 0) {
      result.push({
        typeKey: binding.typeKey,
        choices: choices.map((c: { choiceKey: string }) => c.choiceKey),
      });
    }
  }

  return result;
}

// @MX:ANCHOR: [AUTO] widgetAdminRouter — admin console tRPC router for SPEC-WB-005 simulation, publish, and completeness
// @MX:REASON: fan_in >= 3: admin dashboard, simulation page, publish flow, single test UI
// @MX:SPEC: SPEC-WB-005
export const widgetAdminRouter = router({
  // 1. Dashboard: all active wb products with completeness status
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as unknown as AnyDb;

    const products = await db
      .select({
        id: wbProducts.id,
        productKey: wbProducts.productKey,
        productNameKo: wbProducts.productNameKo,
        isActive: wbProducts.isActive,
        isVisible: wbProducts.isVisible,
        edicusCode: wbProducts.edicusCode,
        mesItemCd: wbProducts.mesItemCd,
      })
      .from(wbProducts)
      .where(eq(wbProducts.isActive, true))
      .orderBy(asc(wbProducts.displayOrder), asc(wbProducts.id));

    const results = await Promise.all(
      products.map(async (product: { id: number; productKey: string; productNameKo: string; isActive: boolean; isVisible: boolean; edicusCode: string | null; mesItemCd: string | null }) => {
        const completenessInput = await fetchCompletenessInput(db, product.id);
        const completeness = checkCompleteness(completenessInput);
        return { ...product, completeness };
      }),
    );

    return results;
  }),

  // 2. Completeness check for a single product
  completeness: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const completenessInput = await fetchCompletenessInput(db, input.productId);
      return checkCompleteness(completenessInput);
    }),

  // 3. Start simulation run for a product
  // Runs synchronously — status is 'completed' when mutation returns
  startSimulation: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        sample: z.boolean().optional(),
        forceRun: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;

      const optionSets = await fetchOptionChoiceSets(db, input.productId);
      const allCombinations = cartesianProduct(optionSets);

      const resolved = resolveSimulationCombinations(allCombinations, {
        sample: input.sample,
        forceRun: input.forceRun,
      });

      if (resolved.tooLarge) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Too many combinations (${resolved.total.toLocaleString()}). Use sample=true to test a 10,000-case sample, or forceRun=true to run all.`,
        });
      }

      const combinations = resolved.combinations;

      // Create run record
      const [run] = await db
        .insert(simulationRuns)
        .values({
          productId: input.productId,
          totalCases: combinations.length,
          status: 'running',
        })
        .returning({ id: simulationRuns.id });

      if (!run) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create simulation run' });
      }

      try {
        // @MX:NOTE: [AUTO] Simulation evaluator is a pass-through stub.
        // Full constraint + pricing evaluation requires assembling per-combination lookup data,
        // which is deferred to a future async job queue implementation.
        const simulationResult = runSimulationCases(combinations, {
          evaluate: (selections): SimulationCaseResult => ({
            selections,
            resultStatus: 'pass',
            totalPrice: null,
            constraintViolations: null,
            priceBreakdown: null,
            message: null,
          }),
        });

        // Batch insert simulation cases (500 per batch)
        const BATCH_SIZE = 500;
        const caseValues = simulationResult.cases.map((c) => ({
          runId: run.id,
          selections: c.selections,
          resultStatus: c.resultStatus,
          totalPrice: c.totalPrice !== null ? String(c.totalPrice) : null,
          constraintViolations: c.constraintViolations ?? null,
          priceBreakdown: c.priceBreakdown ?? null,
          message: c.message,
        }));

        for (let i = 0; i < caseValues.length; i += BATCH_SIZE) {
          const batch = caseValues.slice(i, i + BATCH_SIZE);
          if (batch.length > 0) {
            await db.insert(simulationCases).values(batch);
          }
        }

        await db
          .update(simulationRuns)
          .set({
            status: 'completed',
            passedCount: simulationResult.passed,
            warnedCount: simulationResult.warned,
            erroredCount: simulationResult.errored,
            completedAt: new Date(),
          })
          .where(eq(simulationRuns.id, run.id));

        return { runId: run.id };
      } catch (err) {
        await db
          .update(simulationRuns)
          .set({ status: 'failed', completedAt: new Date() })
          .where(eq(simulationRuns.id, run.id));

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Simulation failed unexpectedly',
          cause: err,
        });
      }
    }),

  // 4. Get simulation run status and counts
  simulationStatus: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;

      const [run] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.id, input.runId));

      if (!run) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulation run not found' });
      }

      return run;
    }),

  // 5. Paginated simulation cases with optional status filter
  simulationCases: protectedProcedure
    .input(
      z.object({
        runId: z.number(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(200).default(50),
        statusFilter: z.enum(['pass', 'warn', 'error']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;

      const conditions = [eq(simulationCases.runId, input.runId)];
      if (input.statusFilter) {
        conditions.push(eq(simulationCases.resultStatus, input.statusFilter));
      }
      const where = and(...conditions);

      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(simulationCases)
          .where(where)
          .orderBy(asc(simulationCases.id))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db
          .select({ cnt: count() })
          .from(simulationCases)
          .where(where),
      ]);

      return {
        data,
        total: Number(totalResult[0]?.cnt ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 6. Export simulation cases as CSV
  exportSimulation: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;

      const cases = await db
        .select()
        .from(simulationCases)
        .where(eq(simulationCases.runId, input.runId))
        .orderBy(asc(simulationCases.id));

      const header = 'id,result_status,total_price,message,selections\n';
      const rows = (cases as Array<{ id: number; resultStatus: string; totalPrice: string | null; message: string | null; selections: unknown }>).map((c) => {
        const selectionsStr = JSON.stringify(c.selections).replace(/"/g, '""');
        const messageStr = (c.message ?? '').replace(/"/g, '""');
        return `${c.id},${c.resultStatus},${c.totalPrice ?? ''},"${messageStr}","${selectionsStr}"`;
      });

      return { csv: header + rows.join('\n'), total: cases.length };
    }),

  // 7. Test a single option combination
  singleTest: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        selections: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      // @MX:TODO: Integrate full constraint evaluator and pricing engine per combination
      // This stub returns pass for all valid combinations. Full integration deferred.
      const result: SimulationCaseResult = {
        selections: input.selections,
        resultStatus: 'pass',
        totalPrice: null,
        constraintViolations: null,
        priceBreakdown: null,
        message: null,
      };
      return result;
    }),

  // 8. Publish product (completeness gate enforced)
  publish: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const completenessInput = await fetchCompletenessInput(db, input.productId);

      let completeness;
      try {
        completeness = validatePublishReadiness(completenessInput);
      } catch (err) {
        if (err instanceof PublishError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: err.message,
          });
        }
        throw err;
      }

      await db
        .update(wbProducts)
        .set({ isVisible: true, isActive: true })
        .where(eq(wbProducts.id, input.productId));

      await db.insert(publishHistory).values({
        productId: input.productId,
        action: 'publish',
        completeness,
      });

      return { success: true as const, completeness };
    }),

  // 9. Unpublish product
  unpublish: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;

      await db
        .update(wbProducts)
        .set({ isVisible: false })
        .where(eq(wbProducts.id, input.productId));

      await db.insert(publishHistory).values({
        productId: input.productId,
        action: 'unpublish',
        completeness: {},
      });

      return { success: true as const };
    }),

  // 10. Publish history for a product
  publishHistory: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      return db
        .select()
        .from(publishHistory)
        .where(eq(publishHistory.productId, input.productId))
        .orderBy(desc(publishHistory.createdAt));
    }),
});
