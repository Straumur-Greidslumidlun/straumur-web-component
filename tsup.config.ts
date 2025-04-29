import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["preact"],
  injectStyle: true,
  loader: {
    ".svg": "jsx", // <- treat SVGs as components
  },
});
