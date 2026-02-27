import { createInsertSchema } from 'drizzle-zod';
import { productSizes } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createSizeSchema = createInsertSchema(productSizes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateSizeSchema = createSizeSchema.partial();

const crudRouter = createCrudRouter({
  table: productSizes,
  createSchema: createSizeSchema,
  updateSchema: updateSizeSchema,
  searchableColumns: ['displayName', 'code'],
  defaultSort: 'displayOrder',
});

export const sizeRouter = router({
  ...crudRouter._def.procedures,
});
