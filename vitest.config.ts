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
      thresholds: {
        lines: 83,
        functions: 78,
        branches: 85,
        statements: 83,
      },
    },
  },
});
