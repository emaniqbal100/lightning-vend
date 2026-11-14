import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['{shared,server}/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['shared/src/**/*.ts', 'server/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/types.ts', '**/index.ts', '**/dist/**'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
