import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './packages/shared/src/db/schema/huni-catalog.schema.ts',
    './packages/shared/src/db/schema/huni-materials.schema.ts',
    './packages/shared/src/db/schema/huni-processes.schema.ts',
    './packages/shared/src/db/schema/huni-pricing.schema.ts',
    './packages/shared/src/db/schema/huni-options.schema.ts',
    './packages/shared/src/db/schema/huni-integration.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
