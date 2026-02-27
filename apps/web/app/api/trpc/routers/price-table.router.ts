import { createInsertSchema } from 'drizzle-zod';
import { priceTables } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createPriceTableSchema = createInsertSchema(priceTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updatePriceTableSchema = createPriceTableSchema.partial();

const crudRouter = createCrudRouter({
  table: priceTables,
  createSchema: createPriceTableSchema,
  updateSchema: updatePriceTableSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'id',
});

export const priceTableRouter = router({
  ...crudRouter._def.procedures,
});
