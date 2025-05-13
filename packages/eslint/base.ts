import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import turboPlugin from "eslint-plugin-turbo";
import unicorn from "eslint-plugin-unicorn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  // Core rules - unicorn provides better defaults than js.configs.recommended
  unicorn.configs.recommended,
  // TypeScript specific rules
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "unicorn/no-for-loop": "error", // Explicitly enable this rule
    },
  },
  // Turbo specific rules
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  // Prettier compatibility
  eslintConfigPrettier,
  // Ignores
  {
    ignores: ["dist/**"],
  },
];
