# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`straumur-web-component` is an embeddable checkout widget published as an npm package (`StraumurCheckout`). Merchants instantiate the class, call `.mount(selector)`, and it renders card / Google Pay / Apple Pay / stored-card payment UIs. It is a **Preact** app (not React) that wraps **Adyen Web (`@adyen/adyen-web` 6.25.0)** — Adyen handles the actual PCI-sensitive card fields and 3-D Secure; this codebase is the surrounding UX, orchestration, and Straumur backend integration.

## Commands

- `npm run build` — bundle with tsup into `dist/` (ESM `.mjs`, CJS `.cjs`, IIFE `.js` exposing `window.StraumurWeb`, plus `.d.ts`/`.d.cts`). **`dist/` is NOT committed** — it is gitignored and built fresh on publish (`prepublishOnly` + the publish workflow). To vendor the IIFE elsewhere (e.g. the backend's `straumur-web-2.0.0.min.js`), run `npm run build` first and copy `dist/index.js`.
- `npm run dev` — tsup in watch mode.
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode; `npm run test:coverage` for coverage (v8, ratchet-only thresholds in `vitest.config.ts` — raise them as coverage improves, never lower). Run a single file with `npx vitest run test/<name>.test.ts`.
- `npm run typecheck` — `tsc -p tsconfig.test.json` (no emit) type-checks **both `src/` and `test/`**. This matters because `npm run build` (tsup's dts step) does **not** fully type-check `.tsx` JSX prop types — a real excess-prop error in source slipped past it once. Run `typecheck` for genuine type safety.
- `npm run lint` / `npm run lint:fix` — ESLint flat config (`eslint.config.js`, typescript-eslint + react-hooks). `h`/`Fragment` are whitelisted for the classic JSX pragma; `react-hooks/refs` is disabled because Adyen handler factories capture refs in event-time closures the rule cannot distinguish from render-time reads.
- `npm run format` / `npm run format:check` — Prettier (120 print width, `endOfLine: auto`; `.prettierrc.json`).

Tests live in `test/` (Vitest + `@testing-library/preact` + jsdom; config in `vitest.config.ts`, setup in `test/setup.ts`). CI (`.github/workflows/ci.yml`) runs `typecheck` → `lint` → `format:check` → `test:coverage` → `build` on pushes to `dev`/`main` and all PRs.

**Testing notes:**

- The JSX pragma is Preact's classic `h` factory — vitest's `esbuild` block replicates the tsconfig setting, and `.tsx` test files must `import { h } from "preact"`. Fragment shorthand `<>...</>` does **not** auto-import; `import { Fragment }` and use `<Fragment>` explicitly.
- To test anything touching a payment flow, mock `@adyen/adyen-web` (export at least `AdyenCheckout`, `CustomCard`, `GooglePay`, `ApplePay`). Wallet classes need an `isAvailable()` returning a promise; `CustomCard`/wallet mocks should call `opts.onConfigSuccess?.()` in their constructor so the component's "initialized" flag flips. Adyen callbacks (`onSubmit`, `onPaymentCompleted`, `onBrand`, `onValidationError`, …) are tested by **capturing** the config/opts objects passed to the mocks, then invoking them directly. Use `vi.hoisted` for any shared capture store/class a `vi.mock` factory references.
- Component tests render through both `I18nProvider` and `PaymentMethodGroupContext`; shared fixtures and a `renderInGroup` helper live in `test/helpers/fixtures.tsx`. jsdom lacks `matchMedia`, so `test/setup.ts` stubs it (non-matching by default; override per test for `useMediaQuery`).
- Backend responses return 200 even for refused/failed payments, so submission tests assert on `resultCode` branches (Authorised / Refused / ChallengeShopper / missing) and that `actions.resolve` is called even on refusal, not on HTTP status.

## Architecture

### Entry and lifecycle

- `src/index.ts` re-exports the default class from `src/straumur-checkout.tsx`. That class is the entire public API: `constructor(config)`, `mount`, `updateConfig`, `setLanguage`, `submitDetails`, `destroy`, `submitCard`, plus internal `handleSuccess`/`handleError`. The constructor delegates to `src/config/build-checkout-configuration.ts` (public→internal mapping, session/advanced detection, validators); the imperative loader/success/failure screens live in `src/components/shared/status-screen.tsx`.
- `mount()` renders a loader, calls `setupPaymentMethods()` to fetch available methods from the Straumur backend, then renders `StraumurCheckoutContainer` wrapped in `RootComponent` + `I18nProvider`. Errors are rendered in-place as a failure icon + localized message (the outer `try/catch` in `mount` logs but never throws into the host page).
- `updateConfig`/`setLanguage` build a **new configuration object** and re-render. Configuration object identity is load-bearing: `useAdyenLocaleReinit` (`src/utils/custom-hooks/use-adyen-locale-reinit.ts`) keys on it to force a full Adyen re-init, because Adyen's `.update()` cannot change locale (Adyen issue #2407). Never create per-render configuration objects.
- Payment result routing follows Adyen Web 6: `Refused`/`Cancelled`/`Error` → `onPaymentFailed({ resultCode })` (payload always present), everything else → `onPaymentCompleted`. Single dispatch point: `dispatchFinalResult` in `src/components/shared/create-adyen-handlers.ts`.
- The 3DS redirect return (`submitDetails`) also goes through the handler factory, with `dispatchResultFromAdditionalDetails: true` because that Adyen bootstrap wires no core-level result callbacks — do not add them there or merchant callbacks double-fire.

### Public vs internal config

`src/models/models.ts` distinguishes `StraumurWebConfiguration` (what merchants pass — `locale: "is" | "en"`, `localizations`, `instantPayments`) from `StraumurCheckoutConfiguration` (internal — `locale: Language` like `"is-IS"`, `customLocalizations`). `normalizeLocale` in `src/localizations/locale.ts` is the single mapping point; the public vocabulary is short codes everywhere (`setLanguage("en")`), with legacy full tags tolerated at runtime only. Keep this boundary: don't leak internal locale codes into the public types.

### Three layers for backend calls

1. `src/adapter/straumur-adapter.ts` — thin `fetch` wrappers (`getPaymentMethods`, `createPaymentRequest`, `createDetailsRequest`, `postDisableTokenRequest`). URLs/base come from `src/env.ts`.
2. `src/services/straumur-service.ts` — wraps the adapter, normalizes responses into a `resultCode: "Success" | "Error"` discriminated union with a `TranslationKey` error.
3. Components call services/adapters directly for payment submission.

`src/env.ts` hardcodes staging vs production base URLs and endpoint paths, selected by `environment: "test" | "live"`. There is no `.env` file; this is the single source of endpoints.

### Component structure: `components/` vs `features/`

- `src/features/*` — self-contained payment methods (card, google-pay, apple-pay, stored-card, instantPayments) and cross-cutting screens (result-component, payment-methods-wrapper). Each `*-component.tsx` decides whether to render based on shared context.
- `src/components/*` — reusable UI primitives (payment-method-item, payment-method-group, tooltip, card-form, render-dual-brand).
- `src/components/shared/*` — the cross-method building blocks: `create-adyen-handlers.ts` (the ONE place Adyen callbacks are built — onSubmit/additional-details/result dispatch), `wallet-button.tsx` (shared Google Pay/Apple Pay skeleton; the two button files are thin wrappers over a per-wallet descriptor map), `before-submit-click.ts` (`runBeforeSubmit` gate + `submitCardWithGate`; the wallet `onClick` handler must stay synchronous — Apple Pay's sheet must open within the user gesture), `status-screen.tsx`.
- `src/flows/payment-flow.ts` — the `PaymentFlow` strategy: session mode calls the Straumur API, the internal advanced mode delegates to host callbacks. Both modes submit through it.

### Shared state: PaymentMethodGroup context

`src/components/payment-method-group/payment-method-group-context.tsx` is the central store (Preact context + `useState`). It holds the active payment method, per-method initialization flags, stored-card selection, success/error `TranslationKey`s, and `threeDSecureActive`. Access it only via the `usePaymentMethodGroup()` hook (throws if used outside the provider). `StraumurCheckoutContainer` computes `initialPaymentMethod`/`isSolePaymentMethod` (via `determineInitialState`) — when exactly one method is available it auto-selects and hides the chooser.

**3-D Secure convention:** when a payment triggers `ChallengeShopper`/`IdentifyShopper`, components set `threeDSecureActive`. Every payment-method component then early-returns `null` via the context's `isObscuredByThreeDS(method)` helper, so the 3DS challenge takes over the full widget. Use that helper when adding methods (stored-card keeps a per-card-id variant because several instances mount at once), and keep the guard **below all hook calls** — an early return above a hook corrupts hook ordering.

### Adyen integration (card-form.tsx)

The card flow uses Adyen's `CustomCard` mounted onto `data-cse`-tagged spans (secure iframes for card number / expiry / CVC). Key callbacks: `onBinLookup` (dual-brand detection), `onBrand` (CVC policy + brand icon filtering), `onSubmit`/`onAdditionalDetails` (POST to Straumur, then `actions.resolve`/`reject`), `onPaymentCompleted`/`onPaymentFailed` (fire merchant callbacks + render result). Note the backend returns **200 OK even for refused payments** — branch on `resultCode`, not HTTP status.

### i18n

`src/localizations/` — `I18nService` resolves keys with precedence: merchant `customLocalizations` → built-in `translations` → the raw key as fallback. `translations.ts` defines the `TranslationKey` union and `Language` (`is-IS` / `en-US`); all user-facing strings must be a `TranslationKey`, and error/success flows pass keys (not literals) around. Consume via `useI18n()`.

## Conventions

- **Preact, not React.** JSX is configured with `jsxFactory: "h"` (tsconfig). Import `h` from `preact` in every `.tsx` file; import hooks from `preact/hooks`. Return type is `h.JSX.Element`.
- **CSS** is co-located per component (`*.css`) and imported directly; tsup's `injectStyle` inlines it into the bundle. Class names use the `straumur__` BEM-ish prefix to avoid clashing with host-page styles.
- **Icons** are `.tsx` components in `src/assets/icons/` returning inline SVG.
- `tsconfig` is strict (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, etc.) — unused imports/vars fail the build. Prefix intentionally-unused params with `_`.
