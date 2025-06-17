/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import path from 'node:path';

import next from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import * as storybook from 'eslint-plugin-storybook';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 */
export default defineConfig([
  // Core rules
  unicorn.configs.recommended,
  // TypeScript specific rules
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React specific rules
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  // Next.js specific rules
  {
    plugins: {
      '@next/next': next,
    },
    // Restrict this to next.js apps only
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: {
      next: {
        rootDir: [path.resolve(import.meta.dirname, '../../apps/web')],
      },
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
  // Storybook specific rules
  // @ts-expect-error - storybook doesn't type the export correctly
  ...storybook.configs['flat/recommended'],
  // Import sorting
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
    },
  },
  // Prettier compatibility
  prettier,
  // ---------- IGNORES ----------
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/out/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.storybook-static/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/.cache/**',
      '**/.vercel/**',
      '**/sst-env.d.ts',
      '**/.sst/**',
      '**/tests/generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.source/**',
    ],
  },
  // ---------- CUSTOM RULE OVERRIDES ----------
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'unicorn/no-abusive-eslint-disable': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-export-from': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/no-null': 'off',
      'react/no-unescaped-entities': 'off',
      'storybook/use-storybook-expect': 'off',
    },
  },
  // Warn on console usage in backend code (should use log package)
  {
    files: ['apps/backend/**'],
    rules: {
      'no-console': 'warn',
    },
  },
]);
