import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/validations/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        '**/trpc/**',
        'src/lib/utils.ts',
        'src/lib/auth.ts',
        'src/lib/db.ts',
        'src/lib/validations/schemas.ts',
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
      '@': path.resolve(__dirname, 'src'),
      '@widget-creator/shared/db/schema': path.resolve(__dirname, '../../packages/shared/src/db/schema/index.ts'),
      '@widget-creator/shared/db': path.resolve(__dirname, '../../packages/shared/src/db/index.ts'),
      '@widget-creator/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
