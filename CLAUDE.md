# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`straumur-web-component` is an embeddable checkout widget published as an npm package (`StraumurCheckout`). Merchants instantiate the class, call `.mount(selector)`, and it renders card / Google Pay / Apple Pay / stored-card payment UIs. It is a **Preact** app (not React) that wraps **Adyen Web (`@adyen/adyen-web` 6.25.0)** — Adyen handles the actual PCI-sensitive card fields and 3-D Secure; this codebase is the surrounding UX, orchestration, and Straumur backend integration.

## Commands

- `npm run build` — bundle with tsup into `dist/` (ESM `.mjs`, CJS `.cjs`, IIFE `.js` exposing `window.StraumurWeb`, plus `.d.ts`/`.d.cts`). **`dist/` is NOT committed** — it is gitignored and built fresh on publish (`prepublishOnly` + the publish workflow). To vendor the IIFE elsewhere (e.g. the backend's `straumur-web-2.0.0.min.js`), run `npm run build` first and copy `dist/index.js`.
- `npm run dev` — tsup in watch mode.
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode; `npm run test:coverage` for coverage (v8, ratchet-only thresholds in `vitest.config.ts` — raise them as coverage improves, never lower). Run a single file with `npx vitest run test/<name>.test.ts`.
- `npm run typecheck` — `tsc -p tsconfig.test.json` (no emit) type-checks **both `src/` and `test/`**. This matters because `npm run build` (tsup's dts step) does **not** fully type-check `.tsx` JSX prop types — a real excess-prop error in source slipped past it once. Run `typecheck` for genuine type safety.
- `npm run lint` / `npm run lint:fix` — ESLint flat config (`eslint.config.js`, typescript-eslint + react-hooks), run with `--max-warnings 0`: any warning fails. An intentionally omitted hook dependency gets an `eslint-disable-next-line react-hooks/exhaustive-deps` with a one-line reason. `h`/`Fragment` are whitelisted for the classic JSX pragma; `react-hooks/refs` is disabled because Adyen handler factories capture refs in event-time closures the rule cannot distinguish from render-time reads.
- `npm run test:smoke` — after `build`, loads `dist/index.js` through a real `<script>` in jsdom (as a merchant page does), mounts it, and checks the ESM/CJS exports, the `.d.ts` files and that the fonts are inlined.
- `npm run format` / `npm run format:check` — Prettier (120 print width, `endOfLine: auto`; `.prettierrc.json`).

Tests live in `test/` (Vitest + `@testing-library/preact` + jsdom; config in `vitest.config.ts`, setup in `test/setup.ts`). CI (`.github/workflows/ci.yml`) runs `typecheck` → `lint` → `format:check` → `test:coverage` → `build` → `test:smoke` on pushes to `dev`/`main` and all PRs. It is also a reusable workflow: `publish-to-npmjs.yml` runs it as a `verify` job that the publish job `needs:`, so nothing is published that fails CI.

**Testing notes:**

- The JSX pragma is Preact's classic `h` factory — the `oxc.jsx` block in `vitest.config.ts` replicates the tsconfig setting (Vitest 4 / Vite 8 transform with oxc; an `esbuild` block is silently ignored), and `.tsx` test files must `import { h } from "preact"`. Fragment shorthand `<>...</>` does **not** auto-import; `import { Fragment }` and use `<Fragment>` explicitly.
- To test anything touching a payment flow, mock `@adyen/adyen-web` (export at least `AdyenCheckout`, `CustomCard`, `GooglePay`, `ApplePay`). Wallet classes need an `isAvailable()` returning a promise; `CustomCard`/wallet mocks should call `opts.onConfigSuccess?.()` in their constructor so the component's "initialized" flag flips, and need a `remove()` (components tear their Adyen element down on unmount). The card's `onSubmit`/`onAdditionalDetails`/`onPaymentCompleted`/`onPaymentFailed`/`onActionHandled` are core-level (`AdyenCheckout` config); field callbacks (`onBrand`, `onBinLookup`, `onAllValid`, …) are on `CustomCard`. A mocked `actions.reject()` must be followed by the core `onPaymentFailed` to see the failure screen — real Adyen does that. Adyen callbacks (`onSubmit`, `onPaymentCompleted`, `onBrand`, `onValidationError`, …) are tested by **capturing** the config/opts objects passed to the mocks, then invoking them directly. Use `vi.hoisted` for any shared capture store/class a `vi.mock` factory references.
- Component tests render through both `I18nProvider` and `PaymentMethodGroupContext`; shared fixtures and a `renderInGroup` helper live in `test/helpers/fixtures.tsx`. jsdom lacks `matchMedia` (used by `useResolvedTheme` for `theme: "system"`), `ResizeObserver` and `FontFace`, so `test/setup.ts` stubs `matchMedia` (non-matching by default); code using the other two must no-op without them.
- Backend responses return 200 even for refused/failed payments, so submission tests assert on `resultCode` branches (Authorised / Refused / ChallengeShopper / missing) and that `actions.resolve` is called even on refusal, not on HTTP status.

## Architecture

### Entry and lifecycle

- `src/index.ts` re-exports the default class from `src/straumur-checkout.tsx`. That class is the entire public API: `constructor(config)`, `mount`, `updateConfig`, `setLanguage`, `submitDetails`, `destroy`, `submitCard`, plus the `private` `handleSuccess`/`handleError` (class-level result screens; TypeScript-only, so untyped IIFE callers still reach them). The constructor delegates to `src/config/build-checkout-configuration.ts` (public→internal mapping, session/advanced detection, validators); the imperative loader/success/failure screens live in `src/components/shared/status-screen.tsx`.
- `mount()` renders a loader, calls `setupPaymentMethods()` to fetch available methods from the Straumur backend, then renders `StraumurCheckoutContainer` wrapped in `RootComponent` + `I18nProvider`. Errors are rendered in-place as a failure icon + localized message; the outer `try/catch` in `mount` logs and shows the failure screen but never throws into the host page. `updateConfig`/`setLanguage` re-render a showing class-level result screen instead of bringing the checkout back, and no-op before payment methods have loaded.
- `updateConfig`/`setLanguage` build a **new configuration object** and re-render. Configuration object identity is load-bearing: `useAdyenLocaleReinit` (`src/utils/custom-hooks/use-adyen-locale-reinit.ts`) rebuilds an Adyen element when the configuration object (or the resolved theme, baked into the field styles) differs from what it was built with — each init calls `markBuilt()` — because Adyen's `.update()` cannot change locale (Adyen issue #2407). The rebuild is **deferred while `paymentInProgress` or `threeDSecureActive`** (it would destroy a live 3DS challenge). Each Adyen host keeps an `initGenerationRef` so a superseded or post-unmount init discards itself. Never create per-render configuration objects.
- Payment result routing follows Adyen Web 6: `Refused`/`Cancelled`/`Error` → `onPaymentFailed({ resultCode })` (payload always present), everything else → `onPaymentCompleted`. Single dispatch point: `dispatchFinalResult` in `src/components/shared/dispatch-final-result.ts` (screens: Authorised → success, Pending/Received → "being processed", else failure; the merchant callback runs last and isolated, so a throwing host callback can't flip the outcome).
- The redirect return (`submitDetails`, for Adyen redirect-3DS and Kortalán) bootstraps no Adyen at all: it calls `paymentFlow.submitAdditionalDetails` directly, then `dispatchFinalResult`. Mounted components never dispatch from the additional-details handler — Adyen invokes the core-level callbacks there, and dispatching too would double-fire the merchant callbacks.
- Submission gating: `beforeSubmit` runs **once**, before Adyen's submit, at every entry point — `submitCardWithGate` for cards (pay button, `submitCard()`, and Enter in the secure fields via `onEnterKeyPressed`) and the wallet `onClick`. Never re-run it in `onSubmit`: a reject there can't be a quiet cancel (Adyen only honours its unexported `CancelError`). Double submits are blocked by the context's synchronous `tryStartPayment`/`isPaymentLocked` (state alone lags a render). A thrown `/payments(/details)` only `actions.reject()`s; the failure screen comes from Adyen's follow-up `onPaymentFailed`.

### Public vs internal config

`src/models/models.ts` distinguishes `StraumurWebConfiguration` (what merchants pass — `locale: "is" | "en"`, `localizations`, `instantPayments`) from `StraumurCheckoutConfiguration` (internal — `locale: Language` like `"is-IS"`, `customLocalizations`). `normalizeLocale` in `src/localizations/locale.ts` is the single mapping point; the public vocabulary is short codes everywhere (`setLanguage("en")`), with legacy full tags tolerated at runtime only. Keep this boundary: don't leak internal locale codes into the public types.

### Three layers for backend calls

1. `src/adapter/straumur-adapter.ts` — thin `fetch` wrappers (`getPaymentMethods`, `createPaymentRequest`, `createDetailsRequest`, `postDisableTokenRequest`). URLs/base come from `src/env.ts`. Every call has a timeout (30s; 90s for `/payment` and `/details`) raising `RequestTimeoutError`, which the payment flow maps to `error.paymentNotConfirmed` — a timed-out payment may still have succeeded, so it is never reported as plainly failed.
2. `src/services/straumur-service.ts` — wraps the adapter, normalizes responses into a `resultCode: "Success" | "Error"` discriminated union with a `TranslationKey` error.
3. Components call services/adapters directly for payment submission.

`src/env.ts` hardcodes staging vs production base URLs and endpoint paths, selected by `environment: "test" | "live"`. There is no `.env` file; this is the single source of endpoints.

### Component structure: `components/` vs `features/`

- `src/features/*` — self-contained payment methods (card, google-pay, apple-pay, stored-card, instantPayments) and cross-cutting screens (result-component, payment-methods-wrapper). Each `*-component.tsx` decides whether to render based on shared context.
- `src/components/*` — reusable UI primitives (payment-method-item, payment-method-group, tooltip, card-form, render-dual-brand).
- `src/components/shared/*` — the cross-method building blocks: `create-adyen-handlers.ts` (the ONE place Adyen callbacks are built — onSubmit/additional-details/result dispatch), `wallet-button.tsx` (shared Google Pay/Apple Pay skeleton; the two button files are thin wrappers over a per-wallet descriptor map), `before-submit-click.ts` (`runBeforeSubmit` gate + `submitCardWithGate`; the wallet `onClick` handler must stay synchronous — Apple Pay's sheet must open within the user gesture), `processing-overlay.tsx` (the "Processing payment…" loader; rendered as a **sibling** of the Adyen mount node, since Adyen swaps that node's children for the 3DS component), `loading-indicator.tsx` (spinner with an accessible name), `status-screen.tsx`.
- `src/flows/payment-flow.ts` — the `PaymentFlow` strategy: session mode calls the Straumur API, the internal advanced mode delegates to host callbacks. Both modes submit through it.

### Shared state: PaymentMethodGroup context

`src/components/payment-method-group/payment-method-group-context.tsx` is the central store (Preact context + `useState`). It holds the active payment method, per-method initialization flags, stored-card selection, success/error `TranslationKey`s, `threeDSecureActive`, the payment lock (`paymentInProgress` + synchronous `tryStartPayment`/`isPaymentLocked`) and `paymentProcessing`. Access it only via the `usePaymentMethodGroup()` hook (throws if used outside the provider). `StraumurCheckoutContainer` computes `initialPaymentMethod`/`isSolePaymentMethod` (via `determineInitialState`) — when exactly one method is available it auto-selects and hides the chooser.

**Processing loader:** the context's `paymentProcessing` flag is set only by the handler factory — on once a submission passes the gate, through `/payments` and the invisible 3DS fingerprint step, off when `onActionHandled` reports the challenge iframe loaded, on again during `/payments/details`. Each method shows the overlay only while it is the active method.

**3-D Secure convention:** when a payment triggers `ChallengeShopper`/`IdentifyShopper`, components set `threeDSecureActive`. Every payment-method component then early-returns `null` via the context's `isObscuredByThreeDS(method)` helper, so the 3DS challenge takes over the full widget. Use that helper when adding methods (stored-card keeps a per-card-id variant because several instances mount at once), and keep the guard **below all hook calls** — an early return above a hook corrupts hook ordering.

### Adyen integration (card-form.tsx)

The card flow uses Adyen's `CustomCard` mounted onto `data-cse`-tagged spans (secure iframes for card number / expiry / CVC). Key callbacks: `onBinLookup` (dual-brand detection), `onBrand` (CVC policy + brand icon filtering), `onSubmit`/`onAdditionalDetails` (POST to Straumur, then `actions.resolve`/`reject`), `onPaymentCompleted`/`onPaymentFailed` (fire merchant callbacks + render result). Note the backend returns **200 OK even for refused payments** — branch on `resultCode`, not HTTP status.

### i18n

`src/localizations/` — `I18nService` resolves keys with precedence: merchant `customLocalizations` → built-in `translations` → the raw key as fallback. `translations.ts` defines the `TranslationKey` union and `Language` (`is-IS` / `en-US`); all user-facing strings must be a `TranslationKey`, and error/success flows pass keys (not literals) around. Consume via `useI18n()`.

## Conventions

- **Preact, not React.** JSX is configured with `jsxFactory: "h"` (tsconfig). Import `h` from `preact` in every `.tsx` file; import hooks from `preact/hooks`. Return type is `h.JSX.Element`.
- **CSS** is co-located per component (`*.css`) and imported directly; tsup's `injectStyle` inlines it into the bundle. Class names use the `straumur__` BEM-ish prefix to avoid clashing with host-page styles. **All colors go through the `--straumur__color-*` tokens in `src/styles/main.css`** — don't hard-code hex in component CSS, or it won't respond to the theme. Sizes are in **px, not rem/em** — this is an embeddable widget, so it must be self-contained and not inherit the host page's root font-size.
- **Responsiveness uses CSS container queries, never viewport `@media`.** The widget's width is set by whatever host container it's embedded in, unrelated to the viewport, so `@media` would break in a narrow host column on a wide screen. `.straumur__root-component` declares `container: straumur / inline-size`; components respond with `@container straumur (max-width: …)`. Do not reintroduce viewport `@media`.
- **Theming.** `RootComponent` (`src/components/shared/status-screen.tsx`) sets `data-theme` on the widget wrapper; the `[data-theme="dark"]` block in `main.css` overrides the color tokens (scoped to the widget, never the host page). `useResolvedTheme` resolves `"system"` from `prefers-color-scheme` live. Adyen's card fields are cross-origin iframes our CSS can't reach — `getAdyenFieldStyles` (`src/utils/adyen-field-styles.ts`) passes literal per-theme colors into the `CustomCard` `styles` config; keep those values in sync with the CSS tokens.
- **Accessibility.** Result screens announce via `role="alert"`/`role="status"`; decorative icons are `aria-hidden`. The dual-brand picker is a keyboard-operable `radiogroup`. `useFocusOnActivate` moves focus into the card container when 3DS takes over. Keep guards below all hooks (rules-of-hooks).
- **Icons** are `.tsx` components in `src/assets/icons/` returning inline SVG.
- **Fonts**: `src/styles/fonts.ts` registers the Akzidenz-Grotesk weights the CSS uses (400/500/700) via the `FontFace` API on `mount()`/`submitDetails()`. Not CSS `@font-face` — tsup's `injectStyle` doesn't resolve `url()`, which would leave paths that 404 on merchant pages; JS imports go through the `.woff2` → dataurl loader, keeping the IIFE self-contained. The family name is widget-specific (`StraumurAkzidenzGroteskPro`).
- **Widget width in JS**: when a layout choice can't be a container query (e.g. the brand-icon "+N" count), use `useWidgetWidth` (ResizeObserver on the root) — never a viewport media query.
- `tsconfig` is strict (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, etc.) — unused imports/vars fail the build. Prefix intentionally-unused params with `_`.
