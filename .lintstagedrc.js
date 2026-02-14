/** The lint-staged configuration for the project (runs before commit) */
const lintStagedConfig = {
  // Lint JS/TS files with oxlint (includes type-checking)
  '*.{js,jsx,ts,tsx}': (filenames) => [
    `oxlint --type-aware --type-check --fix ${filenames.join(' ')}`,
  ],
  // Format all supported file types with oxfmt
  '*': (filenames) => [`oxfmt --no-error-on-unmatched-pattern ${filenames.join(' ')}`],
};

export default lintStagedConfig;
