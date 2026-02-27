import { createInsertSchema } from 'drizzle-zod';
import { fixedPrices } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createFixedPriceSchema = createInsertSchema(fixedPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateFixedPriceSchema = createFixedPriceSchema.partial();

const crudRouter = createCrudRouter({
  table: fixedPrices,
  createSchema: createFixedPriceSchema,
  updateSchema: updateFixedPriceSchema,
  defaultSort: 'id',
});

export const fixedPriceRouter = router({
  ...crudRouter._def.procedures,
});
