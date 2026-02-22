import { createInsertSchema } from 'drizzle-zod';
import { bindings } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createBindingSchema = createInsertSchema(bindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateBindingSchema = createBindingSchema.partial();

const crudRouter = createCrudRouter({
  table: bindings,
  createSchema: createBindingSchema,
  updateSchema: updateBindingSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'displayOrder',
});

export const bindingRouter = router({
  ...crudRouter._def.procedures,
});
