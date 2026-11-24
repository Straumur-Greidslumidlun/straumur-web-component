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
  },
});
