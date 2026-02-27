// @MX:NOTE: [AUTO] constraintTemplateRouter — System constraint template catalog API (SPEC-WB-003 FR-WB003-09)
// @MX:SPEC: SPEC-WB-003
import { createInsertSchema } from 'drizzle-zod';
import { constraintTemplates } from '@widget-creator/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createConstraintTemplateSchema = createInsertSchema(constraintTemplates).omit({
  id: true,
  createdAt: true,
});

const updateConstraintTemplateSchema = createConstraintTemplateSchema.partial();

const crudRouter = createCrudRouter({
  table: constraintTemplates,
  createSchema: createConstraintTemplateSchema,
  updateSchema: updateConstraintTemplateSchema,
  searchableColumns: ['templateKey', 'templateNameKo'],
  defaultSort: 'templateKey',
});

export const constraintTemplateRouter = router({
  ...crudRouter._def.procedures,
});
