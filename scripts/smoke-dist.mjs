// Smoke test of the BUILT artifacts in dist/ (run after `npm run build`). The unit tests exercise
// src/; this checks what merchants actually load:
//   - the IIFE (CDN <script>, and the copy vendored by the backend) exposes window.StraumurWeb and
//     can construct, mount and render a screen — i.e. the bundle is complete and self-contained;
//   - the ESM and CJS entry points export StraumurCheckout;
//   - the type declarations exist.
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

// --- IIFE, loaded the way a merchant page loads it: a classic <script> ---------------------------
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
// Session mount fetches payment methods first; answer with a server error so mount() renders the
// built-in failure screen without any network access.
window.fetch = async () => ({ ok: false, json: async () => ({}) });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const script = window.document.createElement("script");
script.textContent = readFileSync("dist/index.js", "utf8");
window.document.head.appendChild(script);

const Checkout = window.StraumurWeb?.StraumurCheckout;
check(typeof Checkout === "function", "IIFE: window.StraumurWeb.StraumurCheckout is not a constructor");
check(window.document.head.querySelector("style") !== null, "IIFE: bundled CSS was not injected");

if (typeof Checkout === "function") {
  const checkout = new Checkout({ sessionId: "smoke", environment: "test", locale: "en" });
  await checkout.mount("#root");
  const root = window.document.querySelector("#root");
  check(
    root.querySelector(".straumur__root-component") !== null,
    "IIFE: mount() rendered nothing (no .straumur__root-component)"
  );
  check(root.querySelector('[role="alert"]') !== null, "IIFE: mount() did not render the failure screen");
  checkout.destroy();
  check(root.innerHTML === "", "IIFE: destroy() did not clear the mount element");
}

// --- ESM / CJS entry points -------------------------------------------------------------------------
const esm = await import(new URL("../dist/index.mjs", import.meta.url));
check(typeof esm.StraumurCheckout === "function", "ESM: dist/index.mjs does not export StraumurCheckout");

const cjs = createRequire(import.meta.url)("../dist/index.cjs");
check(typeof cjs.StraumurCheckout === "function", "CJS: dist/index.cjs does not export StraumurCheckout");

for (const file of ["dist/index.d.ts", "dist/index.d.cts"]) {
  check(existsSync(file), `types: ${file} is missing`);
}

if (failures.length > 0) {
  console.error(`Dist smoke test FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("Dist smoke test passed (IIFE mount/render/destroy, ESM, CJS, types).");
