import { relations } from 'drizzle-orm';

import { categories, products, productSizes } from './huni-catalog.schema.js';
import { papers, materials, paperProductMappings } from './huni-materials.schema.js';
import { printModes, postProcesses, bindings, impositionRules } from './huni-processes.schema.js';
import {
  priceTables, priceTiers, fixedPrices, packagePrices,
  foilPrices, lossQuantityConfigs,
} from './huni-pricing.schema.js';
import {
  optionDefinitions, productOptions, optionChoices,
  optionConstraints, optionDependencies,
} from './huni-options.schema.js';
import {
  mesItems, mesItemOptions, productMesMappings,
  productEditorMappings, optionChoiceMesMappings,
} from './huni-integration.schema.js';

// ============================================================
// Domain 1: Catalog Relations
// ============================================================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'HuniCategoryHierarchy',
  }),
  children: many(categories, {
    relationName: 'HuniCategoryHierarchy',
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  sizes: many(productSizes),
  productOptions: many(productOptions),
  fixedPrices: many(fixedPrices),
  packagePrices: many(packagePrices),
  paperMappings: many(paperProductMappings),
  mesMappings: many(productMesMappings),
  editorMapping: one(productEditorMappings, {
    fields: [products.id],
    references: [productEditorMappings.productId],
  }),
  constraints: many(optionConstraints),
  dependencies: many(optionDependencies),
}));

export const productSizesRelations = relations(productSizes, ({ one, many }) => ({
  product: one(products, {
    fields: [productSizes.productId],
    references: [products.id],
  }),
  fixedPrices: many(fixedPrices),
  packagePrices: many(packagePrices),
}));

// ============================================================
// Domain 2: Materials Relations
// ============================================================

export const papersRelations = relations(papers, ({ many }) => ({
  productMappings: many(paperProductMappings),
  optionChoices: many(optionChoices),
  fixedPrices: many(fixedPrices),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  optionChoices: many(optionChoices),
  fixedPrices: many(fixedPrices),
}));

export const paperProductMappingsRelations = relations(paperProductMappings, ({ one }) => ({
  paper: one(papers, {
    fields: [paperProductMappings.paperId],
    references: [papers.id],
  }),
  product: one(products, {
    fields: [paperProductMappings.productId],
    references: [products.id],
  }),
}));

// ============================================================
// Domain 3: Processes Relations
// ============================================================

export const printModesRelations = relations(printModes, ({ many }) => ({
  optionChoices: many(optionChoices),
  fixedPrices: many(fixedPrices),
  packagePrices: many(packagePrices),
}));

export const postProcessesRelations = relations(postProcesses, ({ many }) => ({
  optionChoices: many(optionChoices),
}));

export const bindingsRelations = relations(bindings, ({ many }) => ({
  optionChoices: many(optionChoices),
}));

// ============================================================
// Domain 4: Pricing Relations
// ============================================================

export const priceTablesRelations = relations(priceTables, ({ many }) => ({
  tiers: many(priceTiers),
}));

export const priceTiersRelations = relations(priceTiers, ({ one }) => ({
  priceTable: one(priceTables, {
    fields: [priceTiers.priceTableId],
    references: [priceTables.id],
  }),
}));

export const fixedPricesRelations = relations(fixedPrices, ({ one }) => ({
  product: one(products, {
    fields: [fixedPrices.productId],
    references: [products.id],
  }),
  size: one(productSizes, {
    fields: [fixedPrices.sizeId],
    references: [productSizes.id],
  }),
  paper: one(papers, {
    fields: [fixedPrices.paperId],
    references: [papers.id],
  }),
  material: one(materials, {
    fields: [fixedPrices.materialId],
    references: [materials.id],
  }),
  printMode: one(printModes, {
    fields: [fixedPrices.printModeId],
    references: [printModes.id],
  }),
}));

export const packagePricesRelations = relations(packagePrices, ({ one }) => ({
  product: one(products, {
    fields: [packagePrices.productId],
    references: [products.id],
  }),
  size: one(productSizes, {
    fields: [packagePrices.sizeId],
    references: [productSizes.id],
  }),
  printMode: one(printModes, {
    fields: [packagePrices.printModeId],
    references: [printModes.id],
  }),
}));

// ============================================================
// Domain 5: Options Relations
// ============================================================

export const optionDefinitionsRelations = relations(optionDefinitions, ({ many }) => ({
  productOptions: many(productOptions),
  choices: many(optionChoices),
  constraintsSource: many(optionConstraints, { relationName: 'ConstraintSourceOption' }),
  constraintsTarget: many(optionConstraints, { relationName: 'ConstraintTargetOption' }),
  dependenciesParent: many(optionDependencies, { relationName: 'DependencyParentOption' }),
  dependenciesChild: many(optionDependencies, { relationName: 'DependencyChildOption' }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  optionDefinition: one(optionDefinitions, {
    fields: [productOptions.optionDefinitionId],
    references: [optionDefinitions.id],
  }),
  defaultChoice: one(optionChoices, {
    fields: [productOptions.defaultChoiceId],
    references: [optionChoices.id],
  }),
}));

export const optionChoicesRelations = relations(optionChoices, ({ one, many }) => ({
  optionDefinition: one(optionDefinitions, {
    fields: [optionChoices.optionDefinitionId],
    references: [optionDefinitions.id],
  }),
  refPaper: one(papers, {
    fields: [optionChoices.refPaperId],
    references: [papers.id],
  }),
  refMaterial: one(materials, {
    fields: [optionChoices.refMaterialId],
    references: [materials.id],
  }),
  refPrintMode: one(printModes, {
    fields: [optionChoices.refPrintModeId],
    references: [printModes.id],
  }),
  refPostProcess: one(postProcesses, {
    fields: [optionChoices.refPostProcessId],
    references: [postProcesses.id],
  }),
  refBinding: one(bindings, {
    fields: [optionChoices.refBindingId],
    references: [bindings.id],
  }),
  productOptionsDefault: many(productOptions),
  mesMappings: many(optionChoiceMesMappings),
  dependenciesParent: many(optionDependencies, { relationName: 'DependencyParentChoice' }),
}));

export const optionConstraintsRelations = relations(optionConstraints, ({ one }) => ({
  product: one(products, {
    fields: [optionConstraints.productId],
    references: [products.id],
  }),
  sourceOption: one(optionDefinitions, {
    fields: [optionConstraints.sourceOptionId],
    references: [optionDefinitions.id],
    relationName: 'ConstraintSourceOption',
  }),
  targetOption: one(optionDefinitions, {
    fields: [optionConstraints.targetOptionId],
    references: [optionDefinitions.id],
    relationName: 'ConstraintTargetOption',
  }),
}));

export const optionDependenciesRelations = relations(optionDependencies, ({ one }) => ({
  product: one(products, {
    fields: [optionDependencies.productId],
    references: [products.id],
  }),
  parentOption: one(optionDefinitions, {
    fields: [optionDependencies.parentOptionId],
    references: [optionDefinitions.id],
    relationName: 'DependencyParentOption',
  }),
  parentChoice: one(optionChoices, {
    fields: [optionDependencies.parentChoiceId],
    references: [optionChoices.id],
    relationName: 'DependencyParentChoice',
  }),
  childOption: one(optionDefinitions, {
    fields: [optionDependencies.childOptionId],
    references: [optionDefinitions.id],
    relationName: 'DependencyChildOption',
  }),
}));

// ============================================================
// Domain 6: Integration Relations
// ============================================================

export const mesItemsRelations = relations(mesItems, ({ many }) => ({
  options: many(mesItemOptions),
  productMappings: many(productMesMappings),
  choiceMappings: many(optionChoiceMesMappings),
}));

export const mesItemOptionsRelations = relations(mesItemOptions, ({ one }) => ({
  mesItem: one(mesItems, {
    fields: [mesItemOptions.mesItemId],
    references: [mesItems.id],
  }),
}));

export const productMesMappingsRelations = relations(productMesMappings, ({ one }) => ({
  product: one(products, {
    fields: [productMesMappings.productId],
    references: [products.id],
  }),
  mesItem: one(mesItems, {
    fields: [productMesMappings.mesItemId],
    references: [mesItems.id],
  }),
}));

export const productEditorMappingsRelations = relations(productEditorMappings, ({ one }) => ({
  product: one(products, {
    fields: [productEditorMappings.productId],
    references: [products.id],
  }),
}));

export const optionChoiceMesMappingsRelations = relations(optionChoiceMesMappings, ({ one }) => ({
  optionChoice: one(optionChoices, {
    fields: [optionChoiceMesMappings.optionChoiceId],
    references: [optionChoices.id],
  }),
  mesItem: one(mesItems, {
    fields: [optionChoiceMesMappings.mesItemId],
    references: [mesItems.id],
  }),
}));
