import { router } from '../server';
import { categoriesRouter } from './categories';
import { productsRouter } from './products';
import { productSizesRouter } from './product-sizes';
import { papersRouter } from './papers';
import { materialsRouter } from './materials';
import { paperProductMappingsRouter } from './paper-product-mappings';
import { printModesRouter } from './print-modes';
import { postProcessesRouter } from './post-processes';
import { bindingsRouter } from './bindings';
import { impositionRulesRouter } from './imposition-rules';
import { priceTablesRouter } from './price-tables';
import { priceTiersRouter } from './price-tiers';
import { fixedPricesRouter } from './fixed-prices';
import { packagePricesRouter } from './package-prices';
import { foilPricesRouter } from './foil-prices';
import { lossQuantityConfigsRouter } from './loss-quantity-configs';
import { optionDefinitionsRouter } from './option-definitions';
import { optionChoicesRouter } from './option-choices';
import { optionConstraintsRouter } from './option-constraints';
import { optionDependenciesRouter } from './option-dependencies';
import { productOptionsRouter } from './product-options';
import { mesItemsRouter } from './mes-items';
import { productMesMappingsRouter } from './product-mes-mappings';
import { productEditorMappingsRouter } from './product-editor-mappings';
import { optionChoiceMesMappingsRouter } from './option-choice-mes-mappings';
import { widgetsRouter } from './widgets';
import { dashboardRouter } from './dashboard';
import { settingsRouter } from './settings';

export const appRouter = router({
  // Domain 1: Product Catalog
  categories: categoriesRouter,
  products: productsRouter,
  productSizes: productSizesRouter,

  // Domain 2: Materials
  papers: papersRouter,
  materials: materialsRouter,
  paperProductMappings: paperProductMappingsRouter,

  // Domain 3: Processes
  printModes: printModesRouter,
  postProcesses: postProcessesRouter,
  bindings: bindingsRouter,
  impositionRules: impositionRulesRouter,

  // Domain 4: Pricing
  priceTables: priceTablesRouter,
  priceTiers: priceTiersRouter,
  fixedPrices: fixedPricesRouter,
  packagePrices: packagePricesRouter,
  foilPrices: foilPricesRouter,
  lossQuantityConfigs: lossQuantityConfigsRouter,

  // Domain 5: Options
  optionDefinitions: optionDefinitionsRouter,
  optionChoices: optionChoicesRouter,
  optionConstraints: optionConstraintsRouter,
  optionDependencies: optionDependenciesRouter,
  productOptions: productOptionsRouter,

  // Domain 6: Integration
  mesItems: mesItemsRouter,
  productMesMappings: productMesMappingsRouter,
  productEditorMappings: productEditorMappingsRouter,
  optionChoiceMesMappings: optionChoiceMesMappingsRouter,

  // Widget & Dashboard
  widgets: widgetsRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
