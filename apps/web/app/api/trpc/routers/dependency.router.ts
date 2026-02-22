import { createInsertSchema } from 'drizzle-zod';
import { optionDependencies } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createDependencySchema = createInsertSchema(optionDependencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateDependencySchema = createDependencySchema.partial();

const crudRouter = createCrudRouter({
  table: optionDependencies,
  createSchema: createDependencySchema,
  updateSchema: updateDependencySchema,
  defaultSort: 'id',
});

export const dependencyRouter = router({
  ...crudRouter._def.procedures,
});
