import { createInsertSchema } from 'drizzle-zod';
import { optionConstraints } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createConstraintSchema = createInsertSchema(optionConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateConstraintSchema = createConstraintSchema.partial();

const crudRouter = createCrudRouter({
  table: optionConstraints,
  createSchema: createConstraintSchema,
  updateSchema: updateConstraintSchema,
  defaultSort: 'priority',
});

export const constraintRouter = router({
  ...crudRouter._def.procedures,
});
