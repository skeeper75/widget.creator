import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  categories,
  products,
  productSizes,
  papers,
  materials,
  paperProductMappings,
  printModes,
  postProcesses,
  bindings,
  impositionRules,
  priceTables,
  priceTiers,
  fixedPrices,
  packagePrices,
  foilPrices,
  lossQuantityConfigs,
  optionDefinitions,
  optionChoices,
  optionConstraints,
  optionDependencies,
  mesItems,
  mesItemOptions,
  productMesMappings,
  productEditorMappings,
  optionChoiceMesMappings,
  widgets,
  productOptions,
} from '@widget-creator/shared/db/schema';

// ---------------------------------------------------------------------------
// Domain 1: Product Catalog
// ---------------------------------------------------------------------------
export const SelectCategorySchema = createSelectSchema(categories);
export const CreateCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateCategorySchema = CreateCategorySchema.partial();

export const SelectProductSchema = createSelectSchema(products);
export const CreateProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateProductSchema = CreateProductSchema.partial();

export const SelectProductSizeSchema = createSelectSchema(productSizes);
export const CreateProductSizeSchema = createInsertSchema(productSizes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateProductSizeSchema = CreateProductSizeSchema.partial();

// ---------------------------------------------------------------------------
// Domain 2: Materials
// ---------------------------------------------------------------------------
export const SelectPaperSchema = createSelectSchema(papers);
export const CreatePaperSchema = createInsertSchema(papers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePaperSchema = CreatePaperSchema.partial();

export const SelectMaterialSchema = createSelectSchema(materials);
export const CreateMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateMaterialSchema = CreateMaterialSchema.partial();

export const SelectPaperProductMappingSchema = createSelectSchema(paperProductMappings);
export const CreatePaperProductMappingSchema = createInsertSchema(paperProductMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePaperProductMappingSchema = CreatePaperProductMappingSchema.partial();

// ---------------------------------------------------------------------------
// Domain 3: Processes
// ---------------------------------------------------------------------------
export const SelectPrintModeSchema = createSelectSchema(printModes);
export const CreatePrintModeSchema = createInsertSchema(printModes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePrintModeSchema = CreatePrintModeSchema.partial();

export const SelectPostProcessSchema = createSelectSchema(postProcesses);
export const CreatePostProcessSchema = createInsertSchema(postProcesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePostProcessSchema = CreatePostProcessSchema.partial();

export const SelectBindingSchema = createSelectSchema(bindings);
export const CreateBindingSchema = createInsertSchema(bindings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine(
    (data) => {
      if (data.minPages != null && data.maxPages != null) {
        return data.minPages < data.maxPages;
      }
      return true;
    },
    { message: 'minPages must be less than maxPages' },
  );
export const UpdateBindingSchema = createInsertSchema(bindings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export const SelectImpositionRuleSchema = createSelectSchema(impositionRules);
export const CreateImpositionRuleSchema = createInsertSchema(impositionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateImpositionRuleSchema = CreateImpositionRuleSchema.partial();

// ---------------------------------------------------------------------------
// Domain 4: Pricing
// ---------------------------------------------------------------------------
export const SelectPriceTableSchema = createSelectSchema(priceTables);
export const CreatePriceTableSchema = createInsertSchema(priceTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePriceTableSchema = CreatePriceTableSchema.partial();

export const SelectPriceTierSchema = createSelectSchema(priceTiers);
export const CreatePriceTierSchema = createInsertSchema(priceTiers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    unitPrice: z.string().refine((val) => Number(val) >= 0, {
      message: 'unitPrice must not be negative (REQ-N-003)',
    }),
  });
export const UpdatePriceTierSchema = createInsertSchema(priceTiers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    unitPrice: z
      .string()
      .refine((val) => Number(val) >= 0, {
        message: 'unitPrice must not be negative (REQ-N-003)',
      })
      .optional(),
  });

export const SelectFixedPriceSchema = createSelectSchema(fixedPrices);
export const CreateFixedPriceSchema = createInsertSchema(fixedPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateFixedPriceSchema = CreateFixedPriceSchema.partial();

export const SelectPackagePriceSchema = createSelectSchema(packagePrices);
export const CreatePackagePriceSchema = createInsertSchema(packagePrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdatePackagePriceSchema = CreatePackagePriceSchema.partial();

export const SelectFoilPriceSchema = createSelectSchema(foilPrices);
export const CreateFoilPriceSchema = createInsertSchema(foilPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateFoilPriceSchema = CreateFoilPriceSchema.partial();

export const SelectLossQuantityConfigSchema = createSelectSchema(lossQuantityConfigs);
export const CreateLossQuantityConfigSchema = createInsertSchema(lossQuantityConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateLossQuantityConfigSchema = CreateLossQuantityConfigSchema.partial();

// ---------------------------------------------------------------------------
// Domain 5: Options
// ---------------------------------------------------------------------------
export const SelectOptionDefinitionSchema = createSelectSchema(optionDefinitions);
export const CreateOptionDefinitionSchema = createInsertSchema(optionDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateOptionDefinitionSchema = CreateOptionDefinitionSchema.partial();

export const SelectProductOptionSchema = createSelectSchema(productOptions);
export const CreateProductOptionSchema = createInsertSchema(productOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateProductOptionSchema = CreateProductOptionSchema.partial();

export const SelectOptionChoiceSchema = createSelectSchema(optionChoices);
export const CreateOptionChoiceSchema = createInsertSchema(optionChoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateOptionChoiceSchema = CreateOptionChoiceSchema.partial();

export const SelectOptionConstraintSchema = createSelectSchema(optionConstraints);
export const CreateOptionConstraintSchema = createInsertSchema(optionConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateOptionConstraintSchema = CreateOptionConstraintSchema.partial();

export const SelectOptionDependencySchema = createSelectSchema(optionDependencies);
export const CreateOptionDependencySchema = createInsertSchema(optionDependencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateOptionDependencySchema = CreateOptionDependencySchema.partial();

// ---------------------------------------------------------------------------
// Domain 6: Integration
// ---------------------------------------------------------------------------
export const SelectMesItemSchema = createSelectSchema(mesItems);

export const SelectMesItemOptionSchema = createSelectSchema(mesItemOptions);

export const SelectProductMesMappingSchema = createSelectSchema(productMesMappings);
export const CreateProductMesMappingSchema = createInsertSchema(productMesMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const SelectProductEditorMappingSchema = createSelectSchema(productEditorMappings);
export const CreateProductEditorMappingSchema = createInsertSchema(productEditorMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateProductEditorMappingSchema = CreateProductEditorMappingSchema.partial();

export const SelectOptionChoiceMesMappingSchema = createSelectSchema(optionChoiceMesMappings);
export const UpdateMappingStatusSchema = z.object({
  id: z.number(),
  mappingStatus: z.enum(['pending', 'mapped', 'verified']),
  mesItemId: z.number().optional(),
  mesCode: z.string().optional(),
  mappedBy: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------
export const SelectWidgetSchema = createSelectSchema(widgets);
export const CreateWidgetSchema = createInsertSchema(widgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateWidgetSchema = CreateWidgetSchema.partial();
