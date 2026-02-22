import { createInsertSchema } from 'drizzle-zod';
import { postProcesses } from '@widget-creator/shared/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createPostProcessSchema = createInsertSchema(postProcesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updatePostProcessSchema = createPostProcessSchema.partial();

const crudRouter = createCrudRouter({
  table: postProcesses,
  createSchema: createPostProcessSchema,
  updateSchema: updatePostProcessSchema,
  searchableColumns: ['name', 'code'],
  defaultSort: 'displayOrder',
});

export const postProcessRouter = router({
  ...crudRouter._def.procedures,
});
