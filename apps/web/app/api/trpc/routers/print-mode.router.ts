import { createInsertSchema } from 'drizzle-zod';
import { printModes } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createPrintModeSchema = createInsertSchema(printModes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updatePrintModeSchema = createPrintModeSchema.partial();

const crudRouter = createCrudRouter({
  table: printModes,
  createSchema: createPrintModeSchema,
  updateSchema: updatePrintModeSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'displayOrder',
});

export const printModeRouter = router({
  ...crudRouter._def.procedures,
});
