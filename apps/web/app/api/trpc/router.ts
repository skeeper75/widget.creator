import { router } from './trpc.js';
import { categoryRouter } from './routers/category.router.js';
import { productRouter } from './routers/product.router.js';
import { sizeRouter } from './routers/size.router.js';
import { paperRouter } from './routers/paper.router.js';
import { materialRouter } from './routers/material.router.js';
import { printModeRouter } from './routers/print-mode.router.js';
import { postProcessRouter } from './routers/post-process.router.js';
import { bindingRouter } from './routers/binding.router.js';
import { priceTableRouter } from './routers/price-table.router.js';
import { priceTierRouter } from './routers/price-tier.router.js';
import { fixedPriceRouter } from './routers/fixed-price.router.js';
import { optionRouter } from './routers/option.router.js';
import { constraintRouter } from './routers/constraint.router.js';
import { dependencyRouter } from './routers/dependency.router.js';
import { orderRouter } from './routers/order.router.js';
import { dashboardRouter } from './routers/dashboard.router.js';
import { recipeConstraintRouter } from './routers/recipe-constraint.router.js';
import { addonGroupRouter } from './routers/addon-group.router.js';
import { constraintTemplateRouter } from './routers/constraint-template.router.js';

/**
 * Root tRPC router for the Widget Creator Admin API.
 * Combines all domain routers into a single namespace (REQ-040).
 */
export const appRouter = router({
  category: categoryRouter,
  product: productRouter,
  size: sizeRouter,
  paper: paperRouter,
  material: materialRouter,
  printMode: printModeRouter,
  postProcess: postProcessRouter,
  binding: bindingRouter,
  priceTable: priceTableRouter,
  priceTier: priceTierRouter,
  fixedPrice: fixedPriceRouter,
  option: optionRouter,
  constraint: constraintRouter,
  dependency: dependencyRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  recipeConstraint: recipeConstraintRouter,
  addonGroup: addonGroupRouter,
  constraintTemplate: constraintTemplateRouter,
});

export type AppRouter = typeof appRouter;
