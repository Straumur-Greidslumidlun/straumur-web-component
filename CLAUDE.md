# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`straumur-web-component` is an embeddable checkout widget published as an npm package (`StraumurCheckout`). Merchants instantiate the class, call `.mount(selector)`, and it renders card / Google Pay / Apple Pay / stored-card payment UIs. It is a **Preact** app (not React) that wraps **Adyen Web (`@adyen/adyen-web` 6.25.0)** — Adyen handles the actual PCI-sensitive card fields and 3-D Secure; this codebase is the surrounding UX, orchestration, and Straumur backend integration.

## Commands

- `npm run build` — bundle with tsup into `dist/` (ESM `.mjs`, IIFE `.js` exposing `window.StraumurWeb`, plus `.d.ts`). This is also the only typecheck: tsup runs `tsc` for `dts` generation, so a type error fails the build.
- `npm run dev` — tsup in watch mode.
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode. Run a single file with `npx vitest run test/<name>.test.ts`.
- `npm run typecheck` — `tsc -p tsconfig.test.json` (no emit) type-checks **both `src/` and `test/`**. This matters because `npm run build` (tsup's dts step) does **not** fully type-check `.tsx` JSX prop types — a real excess-prop error in source slipped past it once. Run `typecheck` for genuine type safety.

Tests live in `test/` (Vitest + `@testing-library/preact` + jsdom; config in `vitest.config.ts`, setup in `test/setup.ts`). CI (`.github/workflows/ci.yml`) runs `typecheck` → `test` → `build` on pushes to `dev`/`main` and all PRs. There is still **no linter or formatter configured** (stray `eslint-disable` comments notwithstanding) — do not invent `npm run lint`.

**Testing notes:**

- The JSX pragma is Preact's classic `h` factory — vitest's `esbuild` block replicates the tsconfig setting, and `.tsx` test files must `import { h } from "preact"`. Fragment shorthand `<>...</>` does **not** auto-import; `import { Fragment }` and use `<Fragment>` explicitly.
- To test anything touching a payment flow, mock `@adyen/adyen-web` (export at least `AdyenCheckout`, `CustomCard`, `GooglePay`, `ApplePay`). Wallet classes need an `isAvailable()` returning a promise; `CustomCard`/wallet mocks should call `opts.onConfigSuccess?.()` in their constructor so the component's "initialized" flag flips. Adyen callbacks (`onSubmit`, `onPaymentCompleted`, `onBrand`, `onValidationError`, …) are tested by **capturing** the config/opts objects passed to the mocks, then invoking them directly. Use `vi.hoisted` for any shared capture store/class a `vi.mock` factory references.
- Component tests render through both `I18nProvider` and `PaymentMethodGroupContext`; shared fixtures and a `renderInGroup` helper live in `test/helpers/fixtures.tsx`. jsdom lacks `matchMedia`, so `test/setup.ts` stubs it (non-matching by default; override per test for `useMediaQuery`).
- Backend responses return 200 even for refused/failed payments, so submission tests assert on `resultCode` branches (Authorised / Refused / ChallengeShopper / missing) and that `actions.resolve` is called even on refusal, not on HTTP status.

## Architecture

### Entry and lifecycle

- `src/index.ts` re-exports the default class from `src/straumur-checkout.tsx`. That class is the entire public API: `constructor(config)`, `mount`, `updateConfig`, `setLanguage`, `submitDetails`, `destroy`, plus internal `handleSuccess`/`handleError`.
- `mount()` renders a loader, calls `setupPaymentMethods()` to fetch available methods from the Straumur backend, then renders `StraumurCheckoutContainer` wrapped in `RootComponent` + `I18nProvider`. Errors are rendered in-place as a failure icon + localized message (the outer `try/catch` in `mount` intentionally swallows to avoid throwing into the host page).
- `updateConfig`/`setLanguage` mutate config and re-render. Changing locale forces a **full re-init** of the Adyen card component — Adyen's `.update()` cannot change locale (see the comment in `card-form.tsx` referencing Adyen issue #2407).

### Public vs internal config

`src/models/models.ts` distinguishes `StraumurWebConfiguration` (what merchants pass — `locale: "is" | "en"`, `localizations`, `instantPayments`) from `StraumurCheckoutConfiguration` (internal — `locale: Language` like `"is-IS"`, `customLocalizations`). The constructor maps between them via `determineLocale`. Keep this boundary: don't leak internal locale codes into the public type.

### Three layers for backend calls

1. `src/adapter/straumur-adapter.ts` — thin `fetch` wrappers (`getPaymentMethods`, `createPaymentRequest`, `createDetailsRequest`, `postDisableTokenRequest`). URLs/base come from `src/env.ts`.
2. `src/services/straumur-service.ts` — wraps the adapter, normalizes responses into a `resultCode: "Success" | "Error"` discriminated union with a `TranslationKey` error.
3. Components call services/adapters directly for payment submission.

`src/env.ts` hardcodes staging vs production base URLs and endpoint paths, selected by `environment: "test" | "live"`. There is no `.env` file; this is the single source of endpoints.

### Component structure: `components/` vs `features/`

- `src/features/*` — self-contained payment methods (card, google-pay, apple-pay, stored-card, instantPayments) and cross-cutting screens (result-component, payment-methods-wrapper). Each `*-component.tsx` decides whether to render based on shared context.
- `src/components/*` — reusable UI primitives (payment-method-item, payment-method-group, tooltip, card-form, render-dual-brand).

### Shared state: PaymentMethodGroup context

`src/components/payment-method-group/payment-method-group-context.tsx` is the central store (Preact context + `useState`). It holds the active payment method, per-method initialization flags, stored-card selection, success/error `TranslationKey`s, and `threeDSecureActive`. Access it only via the `usePaymentMethodGroup()` hook (throws if used outside the provider). `StraumurCheckoutContainer` computes `initialPaymentMethod`/`isSolePaymentMethod` (via `determineInitialState`) — when exactly one method is available it auto-selects and hides the chooser.

**3-D Secure convention:** when a payment triggers `ChallengeShopper`/`IdentifyShopper`, components set `threeDSecureActive`. Every payment-method component then early-returns `null` unless it is the active method (`activePaymentMethod !== "x" && threeDSecureActive`), so the 3DS challenge takes over the full widget. Preserve this guard when adding methods.

### Adyen integration (card-form.tsx)

The card flow uses Adyen's `CustomCard` mounted onto `data-cse`-tagged spans (secure iframes for card number / expiry / CVC). Key callbacks: `onBinLookup` (dual-brand detection), `onBrand` (CVC policy + brand icon filtering), `onSubmit`/`onAdditionalDetails` (POST to Straumur, then `actions.resolve`/`reject`), `onPaymentCompleted`/`onPaymentFailed` (fire merchant callbacks + render result). Note the backend returns **200 OK even for refused payments** — branch on `resultCode`, not HTTP status.

### i18n

`src/localizations/` — `I18nService` resolves keys with precedence: merchant `customLocalizations` → built-in `translations` → the raw key as fallback. `translations.ts` defines the `TranslationKey` union and `Language` (`is-IS` / `en-US`); all user-facing strings must be a `TranslationKey`, and error/success flows pass keys (not literals) around. Consume via `useI18n()`.

## Conventions

- **Preact, not React.** JSX is configured with `jsxFactory: "h"` (tsconfig). Import `h` from `preact` in every `.tsx` file; import hooks from `preact/hooks`. Return type is `h.JSX.Element`.
- **CSS** is co-located per component (`*.css`) and imported directly; tsup's `injectStyle` inlines it into the bundle. Class names use the `straumur__` BEM-ish prefix to avoid clashing with host-page styles.
- **Icons** are `.tsx` components in `src/assets/icons/` returning inline SVG.
- `tsconfig` is strict (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, etc.) — unused imports/vars fail the build. Prefix intentionally-unused params with `_`.
