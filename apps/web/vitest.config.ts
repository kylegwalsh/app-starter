import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Sets up our vitest test environment
// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  // Add support for tsconfig path aliases
  plugins: [tsconfigPaths()],
});
