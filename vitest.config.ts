import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules/', 'tests/', '**/*.test.ts', '**/*.spec.ts', 'src/types/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
      '@/types': resolve(process.cwd(), './src/types'),
      '@/utils': resolve(process.cwd(), './src/utils'),
      '@/config': resolve(process.cwd(), './src/config'),
      '@/services': resolve(process.cwd(), './src/services'),
    },
  },
});
