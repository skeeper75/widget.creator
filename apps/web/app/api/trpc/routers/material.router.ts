import { createInsertSchema } from 'drizzle-zod';
import { materials } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateMaterialSchema = createMaterialSchema.partial();

const crudRouter = createCrudRouter({
  table: materials,
  createSchema: createMaterialSchema,
  updateSchema: updateMaterialSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'id',
});

export const materialRouter = router({
  ...crudRouter._def.procedures,
});
