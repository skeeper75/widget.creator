import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/api/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        'app/api/_lib/schemas/**',
        'app/api/trpc/**',
        '**/trpc/**',
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app'),
      // More specific aliases must come before less specific ones
      '@widget-creator/shared/db/schema': path.resolve(__dirname, '../../packages/shared/src/db/schema/index.ts'),
      '@widget-creator/shared/db': path.resolve(__dirname, '../../packages/shared/src/db/index.ts'),
      '@widget-creator/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
});
