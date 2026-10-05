import { defineConfig } from "vitest/config";

export default defineConfig({
  // The source uses Preact's classic JSX runtime (jsxFactory "h"), matching tsconfig.json.
  esbuild: {
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
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
      // Measured 2026-10-05: lines/statements 97.7, branches 93.1, functions 91.3.
      thresholds: {
        lines: 95,
        functions: 89,
        branches: 91,
        statements: 95,
      },
    },
  },
});
