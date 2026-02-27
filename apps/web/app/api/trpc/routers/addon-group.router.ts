// @MX:NOTE: [AUTO] addonGroupRouter — Addon group management for ECA show_addon_list action (SPEC-WB-003 FR-WB003-08)
// @MX:SPEC: SPEC-WB-003
import { createInsertSchema } from 'drizzle-zod';
import { addonGroups } from '@widget-creator/db';
import { createCrudRouter } from '../utils/create-crud-router.js';
import { router } from '../trpc.js';

const createAddonGroupSchema = createInsertSchema(addonGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateAddonGroupSchema = createAddonGroupSchema.partial();

const crudRouter = createCrudRouter({
  table: addonGroups,
  createSchema: createAddonGroupSchema,
  updateSchema: updateAddonGroupSchema,
  searchableColumns: ['groupName', 'groupLabel'],
  defaultSort: 'displayOrder',
});

export const addonGroupRouter = router({
  ...crudRouter._def.procedures,
});
