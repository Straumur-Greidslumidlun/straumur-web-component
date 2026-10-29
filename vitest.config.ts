import { defineConfig } from "vitest/config";

export default defineConfig({
  // The source uses Preact's classic JSX runtime (jsxFactory "h"), matching tsconfig.json. Vite 8
  // (Vitest 4) transforms with oxc, not esbuild — an `esbuild.jsx` block here is silently ignored.
  oxc: {
    jsx: {
      runtime: "classic",
      pragma: "h",
      pragmaFrag: "Fragment",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    // CSS imports in components are irrelevant to unit tests; stub them out.
    css: false,
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "html", "lcov"],
      // Ratchet-only floor: raise these as coverage improves, never lower them.
      // Measured 2026-10-05 with Vitest 4's v8 provider (AST-based remapping, stricter than 3.x's —
      // the same suite read 97.7/93.1/91.3/97.7 under Vitest 3): statements 94.0, branches 91.0,
      // functions 92.4, lines 94.6.
      thresholds: {
        lines: 93,
        functions: 90,
        branches: 89,
        statements: 92,
      },
    },
  },
});
