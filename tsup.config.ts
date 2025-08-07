import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  injectStyle: true,
  clean: true, // is an option in tsup that tells it to delete the output directory (like dist/) before each new build.
  sourcemap: true, // A sourcemap is a file (or embedded info) that maps your final bundled/minified code back to your original source code
  bundle: true, // bundles all dependencies into the output files
  external: [], // specify external dependencies that should not be bundled
  splitting: false, // disable code-splitting for easier CDN usage
  minify: true, // means your output code will be compressed and optimized to be as small as possible by removing whitespace, shortening variable names, and other tricks
  loader: {
    ".svg": "jsx",
  },
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
