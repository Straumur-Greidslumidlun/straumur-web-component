# Advanced mode (INTERNAL — Straumur Hosted Checkout only)

> This mode is not part of the public package API. It is not exported from the entry point, not
> documented in the README, and not supported for external integrators. Its only consumer is
> `Payfac.HostedCheckout.Web` (`Views/Checkout/IndexStraumur.cshtml` + `wwwroot/js/checkoutStraumur.js`
> in straumur-backend-ai), which loads the IIFE bundle (`window.StraumurWeb`) so no TypeScript types
> are involved. This file (`docs/`) is excluded from the npm package (`files: ["dist"]`).

In advanced mode the component renders the payment UI, but every backend call is made by the host
page. The mode is detected at runtime: a configuration **without** `sessionId` and **with**
`paymentMethods` (+ the fields below) runs advanced. The internal types live in
`src/models/models.ts` (`StraumurWebAdvancedConfiguration`, `StraumurWebInternalConfiguration`).

## Configuration

```js
const checkout = new window.StraumurWeb.StraumurCheckout({
  environment: "test", // or "live"
  clientKey: "<adyen client key>",
  countryCode: "IS",
  paymentMethods: paymentMethodsResponse, // Adyen /paymentMethods response shape (camelCase)
  amount: { value: 1000, currency: "ISK" }, // minor units
  formattedAmount: "1.000 kr.",
  merchantName: "My Shop",
  enableStoreDetails: "AskForConsent", // "Enabled" | "Disabled" | "AskForConsent"
  locale: "is", // or "en"
  placeholders: { cardNumber, expiryDate, securityCodeThreeDigits, securityCodeFourDigits },
  localizations: { "is-IS": { ... }, "en-US": { ... } },

  // REQUIRED in advanced mode — the host performs the /payments call and resolves the outcome
  onSubmit: async (state, actions) => {
    const response = await fetch("payment", { method: "POST", body: JSON.stringify(state.data) });
    if (!response.ok) { actions.reject(); return; }
    const { resultCode, action, refusalReasonCode } = await response.json();
    actions.resolve({
      resultCode,
      action,
      // optional: buyer-friendly text shown on the built-in failure screen when the payment fails
      errorMessage: mapRefusalReason(refusalReasonCode),
    });
  },

  // REQUIRED — same contract for /payments/details
  onAdditionalDetails: async (state, actions) => { ... },

  // optional: stored-card removal. When omitted, the "Remove" button is hidden.
  onDisableToken: async ({ storedPaymentMethodId }, actions) => {
    const ok = await removeToken(storedPaymentMethodId);
    ok ? actions.resolve() : actions.reject();
  },

  // optional: runs before any payment is submitted; return false to abort.
  // Keep it synchronous when Apple Pay is offered — the payment sheet must open within the user gesture.
  onBeforeSubmit: () => validateMyForm(),

  onPaymentCompleted: (data) => redirectToReturnUrl(),
  onPaymentFailed: (data) => showTryAgain(),
});

await checkout.mount("#straumur-checkout-container");
```

## Redirect return (3-D Secure redirect flow)

```js
// The second argument mounts the result screens when mount() was never called on this page load.
checkout.submitDetails(redirectResult, "#straumur-checkout-container");
```

In advanced mode this delegates to the host's `onAdditionalDetails`.

## Notes

- Zero-amount (`amount.value === 0`) renders "Save card details" button text (tokenization).
  Wallets generally reject zero totals — omit them from `paymentMethods` for tokenization-only checkouts.
- If required advanced fields are missing at runtime, the component shows the init-failure screen
  instead of throwing (IIFE consumers get no compile-time checking).
- Implementation map: mode detection + normalization in `src/straumur-checkout.tsx` +
  `src/services/advanced-normalizer.ts`; the host-callback bridge is `createAdvancedPaymentFlow`
  in `src/flows/payment-flow.ts`; shared Adyen event handlers in
  `src/components/shared/create-adyen-handlers.ts`.
