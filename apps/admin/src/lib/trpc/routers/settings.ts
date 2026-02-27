import { z } from 'zod';
import { router, protectedProcedure } from '../server';

// In-memory settings store (can be migrated to a DB table later)
let appSettings = {
  siteName: 'HuniPrinting Admin',
  defaultPageSize: 20,
  enableAuditLog: false,
};

export const settingsRouter = router({
  get: protectedProcedure.query(() => {
    return appSettings;
  }),

  update: protectedProcedure
    .input(
      z.object({
        siteName: z.string().optional(),
        defaultPageSize: z.number().min(10).max(100).optional(),
        enableAuditLog: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) => {
      appSettings = { ...appSettings, ...input };
      return appSettings;
    }),
});
