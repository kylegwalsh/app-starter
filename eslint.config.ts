// This configuration only applies to the package manager root.
import { config } from "@lib/eslint/base.js";

export default [
  ...config,
  {
    ignores: ["apps/**", "packages/**"],
  },
];
