import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["preact"],
  injectStyle: true,
  clean: true, // is an option in tsup that tells it to delete the output directory (like dist/) before each new build.
  loader: {
    ".svg": "jsx",
  },
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
