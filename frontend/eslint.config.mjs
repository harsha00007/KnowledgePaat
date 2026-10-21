import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Generated and build artifact ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/dist/**",
  ]),
  // Narrowly scoped, justified overrides for automated test suites and CLI tools
  {
    files: ["scripts/**/*.{ts,js}", "*.js"],
    rules: {
      // Standalone CLI tools and scripts require Node.js module resolution where needed
      "@typescript-eslint/no-require-imports": "off",
      // Test runners inspect unshaped provider payloads and browser CDP responses
      "@typescript-eslint/no-explicit-any": "warn",
      // Destructured test payloads may extract fields for validation clarity
      "@typescript-eslint/no-unused-vars": "warn",
      // Interactive scripts may reassign variables across test stages
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
