import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Sets up our vitest test environment
// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    exclude: ['**/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  // Add support for tsconfig path aliases
  plugins: [tsconfigPaths()],
});
