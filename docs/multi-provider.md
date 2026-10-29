# Design note: supporting non-Adyen payment methods

**Status:** design only — nothing here is built yet. Captured so the eventual work draws the
boundaries in the right place. This file is not shipped to npm (`files: ["dist"]` excludes `docs/`).

## Goal

Today the widget renders only Adyen-backed methods (card, stored card, Google Pay, Apple Pay).
In future we want to render payment methods that do **not** go through Adyen (e.g. a direct PayPal
button, a local bank transfer, an off-Adyen BNPL provider). This note describes how to get there
without a rewrite.

## Where the Adyen coupling lives

Two distinct kinds, treated differently:

1. **Execution coupling — mostly already solved.** `src/flows/payment-flow.ts` (`PaymentFlow`)
   already abstracts "how a payment reaches a backend and what comes back." Session and advanced
   mode are two implementations; a non-Adyen backend flow is just a third. Keep this seam.

2. **Rendering + result coupling — the real work.** Three hard-wirings:
   - `@adyen/adyen-web` is imported in 5 files (`card-form`, `wallet-button`, `stored-card`,
     `straumur-checkout`, `create-adyen-handlers`) — each `new AdyenCheckout()` and mounts Adyen
     elements directly.
   - The **closed method set**: `PaymentMethod = "card" | "storedcard" | "googlepay" | "applepay"`
     in `models/constants.ts`, plus the context's hardcoded `hasCard/hasGooglePay/hasApplePay/
hasStoredPaymentMethods` and `Record<PaymentMethod, boolean>`. A new method can't even be
     named without editing the union.
   - The **result/action model**: `resultCode` and `action` are Adyen's vocabulary, and the action
     is handled by the Adyen element itself (`handleAction` → `ThreeDS2Challenge`). A non-Adyen
     method has no Adyen element to hand an action to.

## Target architecture: a payment-method module registry

Each payment method becomes a self-contained module that renders itself and drives its own
submission:

```ts
interface PaymentMethodModule {
  type: string; // open — not the fixed union
  isAvailable(ctx): boolean | Promise<boolean>;
  mount(container: HTMLElement, ctx): void; // render UI + whatever SDK it needs
  unmount(): void;
  submit?(): void; // for the external submit-button flow
  // reports outcome / validity back through ctx callbacks
}
```

- **Adyen becomes one module family**, not the whole widget. `card`, `googlepay`, `applepay`,
  `storedcard` become Adyen-backed modules; the SDK import is confined behind them.
- **Non-Adyen methods** implement the same interface with their own SDK / redirect / UI.
- A **registry** maps `type → module`. The container iterates the _available_ modules and renders
  each, instead of the hardcoded component list.

## What needs to be added

1. **Open the method type + registry.** Replace the closed `PaymentMethod` union with an open
   string type; replace the context capability flags with a dynamic `availableMethods` list. This
   is the keystone — everything depends on the method set being open.
2. **Confine Adyen behind a provider boundary.** Move SDK usage from the 5 files into an `adyen/`
   module family implementing `PaymentMethodModule`. No behavior change — just isolation.
   `create-adyen-handlers.ts` is already ~80% of this adapter.
3. **Provider-neutral outcome + per-module action handling.** Keep a normalized result
   (success / refused / pending / **action-required**) but move "who handles the action" into the
   module: Adyen modules → Adyen's `handleAction`/3DS; a non-Adyen module → its own redirect or
   challenge UI. This breaks the assumption that an Adyen element always exists to consume the action.
4. **Backend method descriptor with a `provider` discriminator.** `/payment-methods` returns an
   Adyen-shaped blob today. To render mixed providers, the backend must describe each method
   neutrally (`type`, display info, `provider`, provider-specific config). This is a backend
   contract change, not just frontend.
5. **Generic container rendering** from the registry instead of the fixed component list.

## Relationship to the AdyenCheckout core / shared-3DS work

"One Adyen core" and "one shared 3DS component" are, in a multi-provider world, **one provider's
internal concern**. The right model is _one core/session per provider_, and 3DS is an Adyen-family
detail hidden behind the module boundary — a non-Adyen method never touches Adyen's 3DS. So the
core consolidation is not a competing task; it is step 2 above (isolating Adyen behind the module),
done inside the Adyen module.

## Recommended approach

**Do not build the plugin system speculatively.** Abstracting for a hypothetical second provider
tends to produce the wrong seam. Wait for **one concrete non-Adyen method** as the forcing function,
then extract the interface from two real cases.

Two cheap things worth doing now to keep the door open:

- **Don't spread `@adyen/adyen-web` imports** beyond the current 5 files — funnel new Adyen usage
  through `create-adyen-handlers` / the shared components.
- **When the core consolidation happens**, structure it as "the Adyen module owns its core," not
  "the widget owns an Adyen core," so the eventual module interface is a rename, not a rewrite.
