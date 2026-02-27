// @MX:ANCHOR: [AUTO] recipeConstraintRouter — ECA constraint management API, referenced by admin UI, constraint evaluator, NL history
// @MX:REASON: fan_in >= 3 (admin CRUD, evaluate endpoint, nl-history router)
// @MX:SPEC: SPEC-WB-003
import { createInsertSchema } from 'drizzle-zod';
import { recipeConstraints } from '@widget-creator/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createRecipeConstraintSchema = createInsertSchema(recipeConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateRecipeConstraintSchema = createRecipeConstraintSchema.partial();

const crudRouter = createCrudRouter({
  table: recipeConstraints,
  createSchema: createRecipeConstraintSchema,
  updateSchema: updateRecipeConstraintSchema,
  defaultSort: 'priority',
});

export const recipeConstraintRouter = router({
  ...crudRouter._def.procedures,
});
