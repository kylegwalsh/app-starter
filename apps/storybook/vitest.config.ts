import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';

const dirname =
  import.meta.dirname === undefined
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: path.join(dirname, '.storybook'),
    }),
  ],
  test: {
    name: 'storybook',
    // Enable browser mode
    browser: {
      enabled: true,
      // Make sure to install Playwright
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: [path.join(dirname, '.storybook/vitest.setup.ts')],
  },
});
