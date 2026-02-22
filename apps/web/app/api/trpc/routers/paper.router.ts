import { createInsertSchema } from 'drizzle-zod';
import { papers } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createPaperSchema = createInsertSchema(papers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updatePaperSchema = createPaperSchema.partial();

const crudRouter = createCrudRouter({
  table: papers,
  createSchema: createPaperSchema,
  updateSchema: updatePaperSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'displayOrder',
});

export const paperRouter = router({
  ...crudRouter._def.procedures,
});
