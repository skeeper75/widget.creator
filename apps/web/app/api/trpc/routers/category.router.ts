import { createInsertSchema } from 'drizzle-zod';
import { categories } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateCategorySchema = createCategorySchema.partial();

const crudRouter = createCrudRouter({
  table: categories,
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'displayOrder',
});

export const categoryRouter = router({
  ...crudRouter._def.procedures,
});
