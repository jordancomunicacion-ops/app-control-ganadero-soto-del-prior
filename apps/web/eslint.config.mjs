import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // CommonJS Node scripts that legitimately use require()
    "prisma/seed.js",
    "scripts/**",
  ]),
  // Relax `any` and unused-vars in tests — Prisma client mocks need `as any` casts
  // and shared mock helpers may go unused per file.
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Demote React 19's "set-state-in-effect" rule from error to warn. The rule
  // flags legitimate patterns (post-mount hydration, data fetching) that the
  // React docs themselves describe as acceptable
  // (https://react.dev/learn/you-might-not-need-an-effect). Keeping it as a
  // warning preserves the signal without breaking CI on otherwise valid code.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      // Allow `_`-prefixed variables/args to signal "intentionally unused".
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
