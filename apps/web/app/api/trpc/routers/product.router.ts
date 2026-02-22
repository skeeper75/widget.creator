import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import {
  products,
  productSizes,
  productOptions,
  optionConstraints,
  optionDependencies,
  fixedPrices,
  packagePrices,
  paperProductMappings,
} from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router, protectedProcedure } from '../trpc.js';

const createProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateProductSchema = createProductSchema.partial();

const crudRouter = createCrudRouter({
  table: products,
  createSchema: createProductSchema,
  updateSchema: updateProductSchema,
  searchableColumns: ['name', 'slug', 'huniCode'],
  defaultSort: 'id',
});

export const productRouter = router({
  ...crudRouter._def.procedures,

  /**
   * Deep clone a product including all related entities:
   * sizes, options, constraints, dependencies, prices, paper mappings.
   */
  clone: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        new_name: z.string().min(1).max(200),
        new_huni_code: z.string().min(1).max(10),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, new_name, new_huni_code } = input;

      // Fetch source product
      const [source] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.id, id));

      if (!source) {
        throw new Error(`Product with id ${id} not found`);
      }

      // Create new product
      const slug = new_name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-|-$/g, '');

      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          categoryId: source.categoryId,
          huniCode: new_huni_code,
          name: new_name,
          slug: `${slug}-${Date.now()}`,
          productType: source.productType,
          pricingModel: source.pricingModel,
          sheetStandard: source.sheetStandard,
          figmaSection: source.figmaSection,
          orderMethod: source.orderMethod,
          editorEnabled: source.editorEnabled,
          description: source.description,
          isActive: false, // Start as inactive
          mesRegistered: false,
        })
        .returning();

      const newProductId = newProduct.id;

      // Clone sizes - build old->new ID map for references
      const sourceSizes = await ctx.db
        .select()
        .from(productSizes)
        .where(eq(productSizes.productId, id));

      const sizeIdMap = new Map<number, number>();
      for (const size of sourceSizes) {
        const [newSize] = await ctx.db
          .insert(productSizes)
          .values({
            productId: newProductId,
            code: size.code,
            displayName: size.displayName,
            cutWidth: size.cutWidth,
            cutHeight: size.cutHeight,
            workWidth: size.workWidth,
            workHeight: size.workHeight,
            bleed: size.bleed,
            impositionCount: size.impositionCount,
            sheetStandard: size.sheetStandard,
            displayOrder: size.displayOrder,
            isCustom: size.isCustom,
            customMinW: size.customMinW,
            customMinH: size.customMinH,
            customMaxW: size.customMaxW,
            customMaxH: size.customMaxH,
            isActive: size.isActive,
          })
          .returning();
        sizeIdMap.set(size.id, newSize.id);
      }

      // Clone product options
      const sourceOptions = await ctx.db
        .select()
        .from(productOptions)
        .where(eq(productOptions.productId, id));

      for (const opt of sourceOptions) {
        await ctx.db.insert(productOptions).values({
          productId: newProductId,
          optionDefinitionId: opt.optionDefinitionId,
          displayOrder: opt.displayOrder,
          isRequired: opt.isRequired,
          isVisible: opt.isVisible,
          isInternal: opt.isInternal,
          uiComponentOverride: opt.uiComponentOverride,
          defaultChoiceId: opt.defaultChoiceId,
          isActive: opt.isActive,
        });
      }

      // Clone option constraints
      const sourceConstraints = await ctx.db
        .select()
        .from(optionConstraints)
        .where(eq(optionConstraints.productId, id));

      for (const c of sourceConstraints) {
        await ctx.db.insert(optionConstraints).values({
          productId: newProductId,
          constraintType: c.constraintType,
          sourceOptionId: c.sourceOptionId,
          sourceField: c.sourceField,
          operator: c.operator,
          value: c.value,
          valueMin: c.valueMin,
          valueMax: c.valueMax,
          targetOptionId: c.targetOptionId,
          targetField: c.targetField,
          targetAction: c.targetAction,
          targetValue: c.targetValue,
          description: c.description,
          priority: c.priority,
          isActive: c.isActive,
        });
      }

      // Clone option dependencies
      const sourceDeps = await ctx.db
        .select()
        .from(optionDependencies)
        .where(eq(optionDependencies.productId, id));

      for (const d of sourceDeps) {
        await ctx.db.insert(optionDependencies).values({
          productId: newProductId,
          parentOptionId: d.parentOptionId,
          parentChoiceId: d.parentChoiceId,
          childOptionId: d.childOptionId,
          dependencyType: d.dependencyType,
          isActive: d.isActive,
        });
      }

      // Clone fixed prices
      const sourceFixedPrices = await ctx.db
        .select()
        .from(fixedPrices)
        .where(eq(fixedPrices.productId, id));

      for (const fp of sourceFixedPrices) {
        await ctx.db.insert(fixedPrices).values({
          productId: newProductId,
          sizeId: fp.sizeId ? (sizeIdMap.get(fp.sizeId) ?? fp.sizeId) : null,
          paperId: fp.paperId,
          materialId: fp.materialId,
          printModeId: fp.printModeId,
          optionLabel: fp.optionLabel,
          baseQty: fp.baseQty,
          sellingPrice: fp.sellingPrice,
          costPrice: fp.costPrice,
          vatIncluded: fp.vatIncluded,
          isActive: fp.isActive,
        });
      }

      // Clone package prices
      const sourcePackagePrices = await ctx.db
        .select()
        .from(packagePrices)
        .where(eq(packagePrices.productId, id));

      for (const pp of sourcePackagePrices) {
        await ctx.db.insert(packagePrices).values({
          productId: newProductId,
          sizeId: sizeIdMap.get(pp.sizeId) ?? pp.sizeId,
          printModeId: pp.printModeId,
          pageCount: pp.pageCount,
          minQty: pp.minQty,
          maxQty: pp.maxQty,
          sellingPrice: pp.sellingPrice,
          costPrice: pp.costPrice,
          isActive: pp.isActive,
        });
      }

      // Clone paper-product mappings
      const sourcePaperMappings = await ctx.db
        .select()
        .from(paperProductMappings)
        .where(eq(paperProductMappings.productId, id));

      for (const pm of sourcePaperMappings) {
        await ctx.db.insert(paperProductMappings).values({
          paperId: pm.paperId,
          productId: newProductId,
          coverType: pm.coverType,
          isDefault: pm.isDefault,
          isActive: pm.isActive,
        });
      }

      return {
        ...newProduct,
        cloned_from: id,
        sizes_cloned: sourceSizes.length,
        options_cloned: sourceOptions.length,
        constraints_cloned: sourceConstraints.length,
        dependencies_cloned: sourceDeps.length,
        fixed_prices_cloned: sourceFixedPrices.length,
        package_prices_cloned: sourcePackagePrices.length,
        paper_mappings_cloned: sourcePaperMappings.length,
      };
    }),
});
