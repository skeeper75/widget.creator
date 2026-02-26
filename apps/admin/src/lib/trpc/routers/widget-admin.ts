import { z } from 'zod';
import { eq, and, desc, asc, count, sql, max } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { TRPCError } from '@trpc/server';
import {
  wbProducts,
  productCategories,
  productRecipes,
  recipeOptionBindings,
  optionElementChoices,
  productPriceConfigs,
  recipeConstraints,
  simulationRuns,
  simulationCases,
  publishHistory,
  printCostBase,
  postprocessCost,
  qtyDiscount,
} from '@widget-creator/db';
import {
  productOptions,
  optionDefinitions,
  optionChoices,
  optionConstraints,
} from '@widget-creator/shared/db/schema';
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
        categoryId: wbProducts.categoryId,
        categoryNameKo: productCategories.categoryNameKo,
      })
      .from(wbProducts)
      .innerJoin(productCategories, eq(wbProducts.categoryId, productCategories.id))
      .where(eq(wbProducts.isActive, true))
      .orderBy(asc(wbProducts.displayOrder), asc(wbProducts.id));

    const results = await Promise.all(
      products.map(async (product: { id: number; productKey: string; productNameKo: string; isActive: boolean; isVisible: boolean; edicusCode: string | null; mesItemCd: string | null; categoryId: number; categoryNameKo: string }) => {
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

  // ─── SPEC-WA-001 Step 2: 주문옵션 설정 ────────────────────────────────────

  // @MX:NOTE: [AUTO] productOptions sub-router — CRUD for product-level option assignments
  // @MX:SPEC: SPEC-WA-001 FR-WA001-05, FR-WA001-06, FR-WA001-07, FR-WA001-08
  productOptions: router({
    // FR-WA001-05: 상품별 옵션 목록 표시
    list: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;

        const rows = await db
          .select({
            id: productOptions.id,
            productId: productOptions.productId,
            optionDefinitionId: productOptions.optionDefinitionId,
            displayOrder: productOptions.displayOrder,
            isRequired: productOptions.isRequired,
            isVisible: productOptions.isVisible,
            isInternal: productOptions.isInternal,
            uiComponentOverride: productOptions.uiComponentOverride,
            defaultChoiceId: productOptions.defaultChoiceId,
            isActive: productOptions.isActive,
            definitionName: optionDefinitions.name,
            definitionKey: optionDefinitions.key,
            definitionClass: optionDefinitions.optionClass,
            choiceCount: sql<number>`(
              SELECT COUNT(*) FROM option_choices
              WHERE option_definition_id = ${productOptions.optionDefinitionId}
              AND is_active = true
            )`.mapWith(Number),
            constraintCount: sql<number>`(
              SELECT COUNT(*) FROM option_constraints
              WHERE product_id = ${productOptions.productId}
              AND (source_option_id = ${productOptions.optionDefinitionId}
                   OR target_option_id = ${productOptions.optionDefinitionId})
              AND is_active = true
            )`.mapWith(Number),
          })
          .from(productOptions)
          .leftJoin(optionDefinitions, eq(productOptions.optionDefinitionId, optionDefinitions.id))
          .where(and(
            eq(productOptions.productId, input.productId),
            eq(productOptions.isActive, true),
          ))
          .orderBy(asc(productOptions.displayOrder), asc(productOptions.id));

        return rows;
      }),

    // FR-WA001-06: 드래그 정렬
    reorder: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderedIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;

        await Promise.all(
          input.orderedIds.map((id, index) =>
            db
              .update(productOptions)
              .set({ displayOrder: index })
              .where(and(
                eq(productOptions.id, id),
                eq(productOptions.productId, input.productId),
              )),
          ),
        );

        return { success: true as const };
      }),

    // FR-WA001-08: 옵션 추가 Dialog
    addToProduct: protectedProcedure
      .input(z.object({
        productId: z.number(),
        optionDefinitionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;

        // Get max displayOrder for this product to append at end
        const [maxResult] = await db
          .select({ maxOrder: max(productOptions.displayOrder) })
          .from(productOptions)
          .where(and(
            eq(productOptions.productId, input.productId),
            eq(productOptions.isActive, true),
          ));

        const nextOrder = (maxResult?.maxOrder ?? -1) + 1;

        const [row] = await db
          .insert(productOptions)
          .values({
            productId: input.productId,
            optionDefinitionId: input.optionDefinitionId,
            displayOrder: nextOrder,
          })
          .onConflictDoNothing()
          .returning();

        return row ?? null;
      }),

    // Soft delete option from product
    remove: protectedProcedure
      .input(z.object({
        productId: z.number(),
        productOptionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;

        const [row] = await db
          .update(productOptions)
          .set({ isActive: false })
          .where(and(
            eq(productOptions.id, input.productOptionId),
            eq(productOptions.productId, input.productId),
          ))
          .returning();

        if (!row) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Product option not found' });
        }

        return { success: true as const };
      }),

    // FR-WA001-07: 옵션 값 인라인 편집
    updateValues: protectedProcedure
      .input(z.object({
        productOptionId: z.number(),
        values: z.object({
          add: z.array(z.object({ code: z.string(), name: z.string() })).optional(),
          remove: z.array(z.number()).optional(),
          reorder: z.array(z.object({ id: z.number(), displayOrder: z.number() })).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;

        // Get the optionDefinitionId for this productOption
        const [productOption] = await db
          .select({ optionDefinitionId: productOptions.optionDefinitionId })
          .from(productOptions)
          .where(eq(productOptions.id, input.productOptionId));

        if (!productOption) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Product option not found' });
        }

        const { optionDefinitionId } = productOption;

        // Batch operations
        await Promise.all([
          // Add new choices
          ...(input.values.add ?? []).map((choice) =>
            db.insert(optionChoices).values({
              optionDefinitionId,
              code: choice.code,
              name: choice.name,
            }).onConflictDoNothing(),
          ),
          // Soft-delete removed choices
          ...(input.values.remove ?? []).map((choiceId) =>
            db
              .update(optionChoices)
              .set({ isActive: false })
              .where(and(
                eq(optionChoices.id, choiceId),
                eq(optionChoices.optionDefinitionId, optionDefinitionId),
              )),
          ),
          // Reorder choices
          ...(input.values.reorder ?? []).map((item) =>
            db
              .update(optionChoices)
              .set({ displayOrder: item.displayOrder })
              .where(and(
                eq(optionChoices.id, item.id),
                eq(optionChoices.optionDefinitionId, optionDefinitionId),
              )),
          ),
        ]);

        return { success: true as const };
      }),
  }),

  // @MX:NOTE: [AUTO] optionDefs sub-router — read-only global option definition library for add-dialog
  // @MX:SPEC: SPEC-WA-001 FR-WA001-08
  optionDefs: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const db = ctx.db as unknown as AnyDb;

        return db
          .select({
            id: optionDefinitions.id,
            key: optionDefinitions.key,
            name: optionDefinitions.name,
            optionClass: optionDefinitions.optionClass,
            optionType: optionDefinitions.optionType,
            uiComponent: optionDefinitions.uiComponent,
            displayOrder: optionDefinitions.displayOrder,
          })
          .from(optionDefinitions)
          .where(eq(optionDefinitions.isActive, true))
          .orderBy(asc(optionDefinitions.displayOrder), asc(optionDefinitions.id));
      }),
  }),

  // @MX:NOTE: [AUTO] pricingTest — real-time admin price quote preview for Step 3 testing
  // @MX:SPEC: SPEC-WA-001 FR-WA001-15
  pricingTest: protectedProcedure
    .input(z.object({
      productId: z.number().int().positive(),
      plateType: z.string().optional(),
      printMode: z.string().optional(),
      qty: z.number().int().min(1).default(100),
      selectedProcessCodes: z.array(z.string()).default([]),
    }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const { productId, plateType, printMode, qty, selectedProcessCodes } = input;

      // 1. Get price config
      const [config] = await db
        .select()
        .from(productPriceConfigs)
        .where(eq(productPriceConfigs.productId, productId));

      if (!config) {
        return { baseCost: '0', postprocessTotal: '0', discountAmount: '0', total: '0', perUnit: '0', note: '가격 설정이 없습니다.' };
      }

      let baseCostNum = 0;

      // 2. Calculate base cost based on priceMode
      if (config.priceMode === 'LOOKUP' && plateType && printMode) {
        const [row] = await db
          .select({ unitPrice: printCostBase.unitPrice })
          .from(printCostBase)
          .where(
            and(
              eq(printCostBase.productId, productId),
              eq(printCostBase.plateType, plateType),
              eq(printCostBase.printMode, printMode),
              eq(printCostBase.isActive, true),
              sql`${printCostBase.qtyMin} <= ${qty}`,
              sql`${printCostBase.qtyMax} >= ${qty}`,
            )
          )
          .limit(1);
        baseCostNum = row ? parseFloat(row.unitPrice) : 0;
      } else if (config.priceMode === 'AREA' && config.unitPriceSqm) {
        // Simple area calculation: assume standard A4 = 0.0623 sqm
        const unitSqm = parseFloat(config.unitPriceSqm);
        const minArea = parseFloat(config.minAreaSqm ?? '0.1');
        baseCostNum = unitSqm * Math.max(minArea, 0.0623) * qty;
      } else if (config.priceMode === 'PAGE' && config.coverPrice) {
        baseCostNum = (parseFloat(config.coverPrice ?? '0') + parseFloat(config.bindingCost ?? '0')) * qty;
      } else if (config.priceMode === 'COMPOSITE' && config.baseCost) {
        baseCostNum = parseFloat(config.baseCost) * qty;
      }

      // 3. Calculate postprocess costs
      let postprocessTotalNum = 0;
      if (selectedProcessCodes.length > 0) {
        const processes = await db
          .select()
          .from(postprocessCost)
          .where(
            and(
              sql`(${postprocessCost.productId} = ${productId} OR ${postprocessCost.productId} IS NULL)`,
              sql`${postprocessCost.processCode} IN ${selectedProcessCodes}`,
              eq(postprocessCost.isActive, true),
              sql`${postprocessCost.qtyMin} <= ${qty}`,
              sql`${postprocessCost.qtyMax} >= ${qty}`,
            )
          );

        for (const p of processes) {
          const unitP = parseFloat(p.unitPrice);
          if (p.priceType === 'per_unit') {
            postprocessTotalNum += unitP * qty;
          } else {
            postprocessTotalNum += unitP;
          }
        }
      }

      // 4. Calculate quantity discount
      const [discountRow] = await db
        .select({ discountRate: qtyDiscount.discountRate, discountLabel: qtyDiscount.discountLabel })
        .from(qtyDiscount)
        .where(
          and(
            sql`(${qtyDiscount.productId} = ${productId} OR ${qtyDiscount.productId} IS NULL)`,
            eq(qtyDiscount.isActive, true),
            sql`${qtyDiscount.qtyMin} <= ${qty}`,
            sql`${qtyDiscount.qtyMax} >= ${qty}`,
          )
        )
        .orderBy(asc(qtyDiscount.displayOrder))
        .limit(1);

      const discountRate = discountRow ? parseFloat(discountRow.discountRate) : 0;
      const subtotal = baseCostNum + postprocessTotalNum;
      const discountAmount = Math.round(subtotal * discountRate);
      const total = subtotal - discountAmount;
      const perUnit = qty > 0 ? Math.round(total / qty) : 0;

      return {
        baseCost: baseCostNum.toFixed(0),
        postprocessTotal: postprocessTotalNum.toFixed(0),
        discountAmount: discountAmount.toFixed(0),
        discountRate: discountRow ? discountRow.discountRate : '0',
        discountLabel: discountRow?.discountLabel ?? null,
        total: total.toFixed(0),
        perUnit: perUnit.toString(),
        priceMode: config.priceMode,
      };
    }),

  // @MX:NOTE: [AUTO] priceConfig sub-router — get/update price mode config for a product (LOOKUP/AREA/PAGE/COMPOSITE)
  // @MX:SPEC: SPEC-WA-001 FR-WA001-10, FR-WA001-12
  priceConfig: router({
    get: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const [config] = await db
          .select()
          .from(productPriceConfigs)
          .where(eq(productPriceConfigs.productId, input.productId));
        return config ?? null;
      }),

    update: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        priceMode: z.enum(['LOOKUP', 'AREA', 'PAGE', 'COMPOSITE']),
        formulaText: z.string().max(1000).nullable().optional(),
        unitPriceSqm: z.string().nullable().optional(),
        minAreaSqm: z.string().nullable().optional(),
        imposition: z.number().int().nullable().optional(),
        coverPrice: z.string().nullable().optional(),
        bindingCost: z.string().nullable().optional(),
        baseCost: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const { productId, ...config } = input;

        // Upsert: insert on conflict update
        const [result] = await db
          .insert(productPriceConfigs)
          .values({ productId, ...config })
          .onConflictDoUpdate({
            target: productPriceConfigs.productId,
            set: { ...config, updatedAt: new Date() },
          })
          .returning();

        return result;
      }),
  }),

  // @MX:NOTE: [AUTO] printCostBase sub-router — LOOKUP mode price table management (plateType × printMode × qty tier)
  // @MX:SPEC: SPEC-WA-001 FR-WA001-11
  printCostBase: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        return db
          .select()
          .from(printCostBase)
          .where(and(eq(printCostBase.productId, input.productId), eq(printCostBase.isActive, true)))
          .orderBy(asc(printCostBase.plateType), asc(printCostBase.printMode), asc(printCostBase.qtyMin));
      }),

    upsert: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        rows: z.array(z.object({
          id: z.number().int().optional(),
          plateType: z.string().min(1).max(50),
          printMode: z.string().min(1).max(50),
          qtyMin: z.number().int().min(0),
          qtyMax: z.number().int().min(1),
          unitPrice: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const { productId, rows } = input;

        // Delete all existing active rows for this product, then re-insert
        await db
          .delete(printCostBase)
          .where(eq(printCostBase.productId, productId));

        if (rows.length === 0) return { count: 0 };

        const inserted = await db
          .insert(printCostBase)
          .values(rows.map((r) => ({
            productId,
            plateType: r.plateType,
            printMode: r.printMode,
            qtyMin: r.qtyMin,
            qtyMax: r.qtyMax,
            unitPrice: r.unitPrice,
          })))
          .returning({ id: printCostBase.id });

        return { count: inserted.length };
      }),
  }),

  // @MX:NOTE: [AUTO] postprocessCost sub-router — post-processing cost management (product-specific and global)
  // @MX:SPEC: SPEC-WA-001 FR-WA001-13
  postprocessCost: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        // Return both product-specific and global (productId IS NULL) rows
        return db
          .select()
          .from(postprocessCost)
          .where(
            sql`(${postprocessCost.productId} = ${input.productId} OR ${postprocessCost.productId} IS NULL)`
          )
          .orderBy(asc(postprocessCost.processCode));
      }),

    upsert: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        rows: z.array(z.object({
          id: z.number().int().optional(),
          processCode: z.string().min(1).max(50),
          processNameKo: z.string().min(1).max(100),
          qtyMin: z.number().int().min(0).default(0),
          qtyMax: z.number().int().min(1).default(999999),
          unitPrice: z.string(),
          priceType: z.enum(['fixed', 'per_unit', 'per_sqm']).default('fixed'),
          isActive: z.boolean().default(true),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const { productId, rows } = input;

        // Delete product-specific rows, then re-insert
        await db
          .delete(postprocessCost)
          .where(eq(postprocessCost.productId, productId));

        if (rows.length === 0) return { count: 0 };

        const inserted = await db
          .insert(postprocessCost)
          .values(rows.map((r) => ({
            productId,
            processCode: r.processCode,
            processNameKo: r.processNameKo,
            qtyMin: r.qtyMin,
            qtyMax: r.qtyMax,
            unitPrice: r.unitPrice,
            priceType: r.priceType,
            isActive: r.isActive,
          })))
          .returning({ id: postprocessCost.id });

        return { count: inserted.length };
      }),
  }),

  // @MX:NOTE: [AUTO] qtyDiscount sub-router — quantity discount tier management
  // @MX:SPEC: SPEC-WA-001 FR-WA001-14
  qtyDiscount: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        // Return both product-specific and global (productId IS NULL) rows
        return db
          .select()
          .from(qtyDiscount)
          .where(
            sql`(${qtyDiscount.productId} = ${input.productId} OR ${qtyDiscount.productId} IS NULL)`
          )
          .orderBy(asc(qtyDiscount.displayOrder), asc(qtyDiscount.qtyMin));
      }),

    upsert: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        rows: z.array(z.object({
          id: z.number().int().optional(),
          qtyMin: z.number().int().min(0),
          qtyMax: z.number().int().min(1),
          discountRate: z.string(),
          discountLabel: z.string().max(50).optional(),
          displayOrder: z.number().int().default(0),
          isActive: z.boolean().default(true),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const { productId, rows } = input;

        // Delete product-specific rows, then re-insert
        await db
          .delete(qtyDiscount)
          .where(eq(qtyDiscount.productId, productId));

        if (rows.length === 0) return { count: 0 };

        const inserted = await db
          .insert(qtyDiscount)
          .values(rows.map((r, idx) => ({
            productId,
            qtyMin: r.qtyMin,
            qtyMax: r.qtyMax,
            discountRate: r.discountRate,
            discountLabel: r.discountLabel,
            displayOrder: r.displayOrder ?? idx,
            isActive: r.isActive,
          })))
          .returning({ id: qtyDiscount.id });

        return { count: inserted.length };
      }),
  }),

  // @MX:NOTE: [AUTO] constraints sub-router — CRUD for ECA constraint rules on product's default recipe
  // @MX:SPEC: SPEC-WA-001 FR-WA001-16 through FR-WA001-21
  constraints: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const [defaultRecipe] = await db
          .select({ id: productRecipes.id })
          .from(productRecipes)
          .where(and(eq(productRecipes.productId, input.productId), eq(productRecipes.isDefault, true)));

        if (!defaultRecipe) return [];

        return db
          .select()
          .from(recipeConstraints)
          .where(eq(recipeConstraints.recipeId, defaultRecipe.id))
          .orderBy(asc(recipeConstraints.priority), asc(recipeConstraints.id));
      }),

    create: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        name: z.string().min(1).max(100),
        triggerOptionKey: z.string().min(1).max(50),
        triggerOperator: z.enum(['equals', 'in', 'not_in', 'contains', 'beginsWith', 'endsWith']),
        triggerValues: z.array(z.string()).min(1),
        extraConditions: z.record(z.unknown()).nullable().optional(),
        actions: z.array(z.object({
          type: z.enum(['show_addon_list', 'filter_options', 'exclude_options', 'auto_add', 'require_option', 'show_message', 'change_price_mode', 'set_default']),
        }).passthrough()).min(1),
        priority: z.number().int().default(0),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const [defaultRecipe] = await db
          .select({ id: productRecipes.id })
          .from(productRecipes)
          .where(and(eq(productRecipes.productId, input.productId), eq(productRecipes.isDefault, true)));

        if (!defaultRecipe) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Default recipe not found for product' });
        }

        const [created] = await db
          .insert(recipeConstraints)
          .values({
            recipeId: defaultRecipe.id,
            constraintName: input.name,
            triggerOptionType: input.triggerOptionKey,
            triggerOperator: input.triggerOperator,
            triggerValues: input.triggerValues,
            extraConditions: input.extraConditions ?? null,
            actions: input.actions,
            priority: input.priority,
            comment: input.comment,
            inputMode: 'manual',
          })
          .returning();

        return created;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        productId: z.number().int().positive(),
        name: z.string().min(1).max(100).optional(),
        triggerOptionKey: z.string().min(1).max(50).optional(),
        triggerOperator: z.enum(['equals', 'in', 'not_in', 'contains', 'beginsWith', 'endsWith']).optional(),
        triggerValues: z.array(z.string()).min(1).optional(),
        extraConditions: z.record(z.unknown()).nullable().optional(),
        actions: z.array(z.object({
          type: z.enum(['show_addon_list', 'filter_options', 'exclude_options', 'auto_add', 'require_option', 'show_message', 'change_price_mode', 'set_default']),
        }).passthrough()).min(1).optional(),
        priority: z.number().int().optional(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const { id, productId, ...updateData } = input;

        const [defaultRecipe] = await db
          .select({ id: productRecipes.id })
          .from(productRecipes)
          .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isDefault, true)));

        if (!defaultRecipe) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Default recipe not found' });
        }

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };
        if (updateData.name !== undefined) updateValues.constraintName = updateData.name;
        if (updateData.triggerOptionKey !== undefined) updateValues.triggerOptionType = updateData.triggerOptionKey;
        if (updateData.triggerOperator !== undefined) updateValues.triggerOperator = updateData.triggerOperator;
        if (updateData.triggerValues !== undefined) updateValues.triggerValues = updateData.triggerValues;
        if (updateData.extraConditions !== undefined) updateValues.extraConditions = updateData.extraConditions;
        if (updateData.actions !== undefined) updateValues.actions = updateData.actions;
        if (updateData.priority !== undefined) updateValues.priority = updateData.priority;
        if (updateData.comment !== undefined) updateValues.comment = updateData.comment;

        const [updated] = await db
          .update(recipeConstraints)
          .set(updateValues)
          .where(and(
            eq(recipeConstraints.id, id),
            eq(recipeConstraints.recipeId, defaultRecipe.id),
          ))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint not found' });
        }

        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        productId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const [defaultRecipe] = await db
          .select({ id: productRecipes.id })
          .from(productRecipes)
          .where(and(eq(productRecipes.productId, input.productId), eq(productRecipes.isDefault, true)));

        if (!defaultRecipe) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Default recipe not found' });
        }

        const [deleted] = await db
          .delete(recipeConstraints)
          .where(and(
            eq(recipeConstraints.id, input.id),
            eq(recipeConstraints.recipeId, defaultRecipe.id),
          ))
          .returning({ id: recipeConstraints.id });

        if (!deleted) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint not found' });
        }

        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        productId: z.number().int().positive(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = ctx.db as unknown as AnyDb;
        const [defaultRecipe] = await db
          .select({ id: productRecipes.id })
          .from(productRecipes)
          .where(and(eq(productRecipes.productId, input.productId), eq(productRecipes.isDefault, true)));

        if (!defaultRecipe) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Default recipe not found' });
        }

        const [updated] = await db
          .update(recipeConstraints)
          .set({ isActive: input.isActive, updatedAt: new Date() })
          .where(and(
            eq(recipeConstraints.id, input.id),
            eq(recipeConstraints.recipeId, defaultRecipe.id),
          ))
          .returning({ id: recipeConstraints.id, isActive: recipeConstraints.isActive });

        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint not found' });
        }

        return updated;
      }),
  }),
});
