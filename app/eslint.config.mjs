import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // React 19 / Next 16 introduces strict react-compiler rules that flag
    // many legitimate hydration / SSR-init patterns (setState in effect to
    // load from localStorage, Date.now() in render for "now" calculations).
    // Downgrade them to warnings so they're surfaced but don't block CI.
    // Tracked as tech debt to address in a dedicated cleanup batch.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-render": "warn",
    },
  },
]);

export default eslintConfig;
