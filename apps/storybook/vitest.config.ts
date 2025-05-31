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
      // The location of your Storybook config, main.ts
      configDir: path.join(dirname, '.storybook'),
      // This should match your package.json script to run Storybook
      // The --ci flag will skip prompts and not open a browser
      storybookScript: 'pnpm dev --ci',
    }),
  ],
  test: {
    // Enable browser mode
    browser: {
      enabled: true,
      // Make sure to install Playwright
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['./.storybook/vitest.setup.ts'],
  },
});
