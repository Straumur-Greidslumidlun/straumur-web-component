import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs", "iife"], // ESM + CJS for bundlers/Node, IIFE for the CDN script tag (window.StraumurWeb)
  globalName: "StraumurWeb", // for IIFE: window.StraumurWeb
  dts: true, // this allows other TypeScript projects (like merchant apps) to get type safety and autocompletion when they import your package
  injectStyle: true, // this option allows you to inject CSS styles directly into the output bundle, which is useful for web components that need styles
  clean: true, // is an option in tsup that tells it to delete the output directory (like dist/) before each new build.
  // Maps are generated for local debugging but excluded from the npm package ("files" in package.json).
  sourcemap: true,
  bundle: true,
  // Nothing is forced external, but tsup still externalizes package.json `dependencies` (preact,
  // @adyen/adyen-web) for the ESM/CJS builds — the merchant's bundler resolves them. Only the IIFE
  // inlines everything, so the CDN <script> is self-contained.
  external: [],
  splitting: false, // disable code-splitting for easier CDN usage
  minify: true, // means your output code will be compressed and optimized to be as small as possible by removing whitespace, shortening variable names, and other tricks
  loader: {
    ".svg": "jsx",
    // The @font-face files in styles/main.css are inlined, keeping the IIFE a single self-contained file.
    ".woff2": "dataurl",
  },
  outExtension({ format }) {
    if (format === "esm") return { js: ".mjs" };
    if (format === "cjs") return { js: ".cjs" };
    // IIFE keeps .js: unpkg/jsdelivr serve it and the backend vendors it under this name.
    return { js: ".js" };
  },
});
