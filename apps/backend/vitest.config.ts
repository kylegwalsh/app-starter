import path from 'node:path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Sets up our vitest test environment
// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/setup.ts'],
    globalSetup: ['./tests/setup/global-setup.ts', './tests/setup/global-teardown.ts'],
    include: ['**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
    alias: {
      // Override our db import to use our mock db
      '@/db': path.resolve(import.meta.dirname, './tests/mocks/db'),
    },
  },
  // Add support for tsconfig path aliases
  plugins: [tsconfigPaths()],
});
