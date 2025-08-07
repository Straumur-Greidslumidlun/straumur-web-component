import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "iife"], // ESM for modern browsers, IIFE for immediate execution
  globalName: "StraumurCheckout", // for IIFE: window.StraumurCheckout
  dts: true, // this allows other TypeScript projects (like merchant apps) to get type safety and autocompletion when they import your package
  injectStyle: true, // this option allows you to inject CSS styles directly into the output bundle, which is useful for web components that need styles
  clean: true, // is an option in tsup that tells it to delete the output directory (like dist/) before each new build.
  sourcemap: true, // a sourcemap is a file (or embedded info) that maps your final bundled/minified code back to your original source code
  bundle: true, // bundles all dependencies into the output files
  external: [], // specify external dependencies that should not be bundled
  splitting: false, // disable code-splitting for easier CDN usage
  minify: true, // means your output code will be compressed and optimized to be as small as possible by removing whitespace, shortening variable names, and other tricks
  loader: {
    ".svg": "jsx",
  },
  outExtension({ format }) {
    if (format === "esm") return { js: ".mjs" };
    if (format === "iife") return { js: ".js" };
    return { js: ".js" };
  },
});
