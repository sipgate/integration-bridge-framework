import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/", "**/*.test.ts"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  importPlugin.flatConfigs.warnings,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "import/no-cycle": "error",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
