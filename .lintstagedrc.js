export default {
  // Lint JS/TS files with oxlint (includes type-checking)
  '*.{js,jsx,ts,tsx}': (filenames) => [
    `oxlint --type-aware --type-check --fix ${filenames.join(' ')}`,
  ],
  // Format all supported file types with oxfmt
  '*.{js,jsx,ts,tsx,json,jsonc,yaml,yml,toml,html,css,scss,less,md,mdx}': (filenames) => [
    `oxfmt ${filenames.join(' ')}`,
  ],
};
