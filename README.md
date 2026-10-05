# straumur-web-component

An embeddable, PCI-friendly checkout component for accepting card, saved-card, Google Pay, Apple Pay
and Kortalán payments through [Straumur](https://straumur.is). It renders a complete payment UI into an element
on your page and handles the payment flow (including 3‑D Secure) for you.

📚 **Full documentation:** <https://docs.straumur.is> — see
[Straumur Components](https://docs.straumur.is/category/straumur-components) and the
[Web Integration](https://docs.straumur.is/payment-gateway/components/straumur-components/web-component)
guide.

## Installation

```bash
npm install straumur-web-component
```

## Quick start

The component is driven by a **session**. First, create a session from your backend by calling
Straumur's [`/embeddedcheckout/session`](https://docs.straumur.is/payment-gateway/components/straumur-components/basic-session-request)
endpoint — it returns a `sessionId`. Pass that `sessionId` to the component on the client.

Add a container element to your page:

```html
<div id="component-container"></div>
```

Then initialize and mount the component:

```javascript
import { StraumurCheckout } from "straumur-web-component";

const paymentConfiguration = {
  environment: "test", // "test" | "live"
  sessionId: "ftsdre3h...e5h5as2q4", // from your /embeddedcheckout/session response
  onPaymentCompleted: (data) => {
    console.info("Payment completed", data.resultCode);
  },
  onPaymentFailed: (data) => {
    console.info("Payment failed", data.resultCode);
  },
  locale: "en", // "is" | "en"
  instantPayments: ["applepay", "googlepay"],
  placeholders: {
    cardNumber: "1234 5678 9012 3456",
  },
  localizations: {
    en: {
      "cards.title": "Card Information",
    },
  },
};

const checkout = new StraumurCheckout(paymentConfiguration);
checkout.mount("#component-container");
```

### Using the CDN / script tag (no bundler)

The package also ships an IIFE build that exposes a global `StraumurWeb`. Pin the exact version in
production — 2.x pre-releases are published under the `next` tag, so an unversioned URL still
resolves to 1.x:

```html
<div id="component-container"></div>
<script src="https://unpkg.com/straumur-web-component@2.0.0-alpha.31"></script>
<script>
  const checkout = new StraumurWeb.StraumurCheckout({
    environment: "test",
    sessionId: "ftsdre3h...e5h5as2q4",
  });
  checkout.mount("#component-container");
</script>
```

## Configuration

Passed to the `StraumurCheckout` constructor:

| Option                     | Type                                                       | Required | Description                                                                                           |
| -------------------------- | ---------------------------------------------------------- | :------: | ----------------------------------------------------------------------------------------------------- |
| `sessionId`                | `string`                                                   |    ✅    | The session id from your `/embeddedcheckout/session` response.                                        |
| `environment`              | `"test" \| "live"`                                         |    ✅    | Selects the Straumur staging or production backend.                                                   |
| `locale`                   | `"is" \| "en"`                                             |          | UI language. Defaults to Icelandic (`is`).                                                            |
| `theme`                    | `"light" \| "dark" \| "system" \| ThemeConfiguration`      |          | Color theme, optionally with wallet button styles — see [Theming](#theming).                          |
| `onPaymentCompleted`       | `(data: { resultCode }) => void`                           |          | Called when the payment flow completes (see result codes below).                                      |
| `onPaymentFailed`          | `(data: { resultCode }) => void`                           |          | Called when the payment flow fails (see result codes below).                                          |
| `instantPayments`          | `("googlepay" \| "applepay")[]`                            |          | Renders the listed wallets as express buttons above the standard methods.                             |
| `allowedPaymentMethods`    | `PaymentMethod[]`                                          |          | Only show these of the session's methods. Omit to show all.                                           |
| `orderPaymentMethods`      | `PaymentMethodOrder[]`                                     |          | Top-to-bottom order of the methods — see [Choosing methods](#choosing-methods).                       |
| `openDefaultPaymentMethod` | `"card" \| "firstStoredCard" \| "googlepay" \| "applepay"` |          | Method to expand on load. Ignored if unavailable. Default: none expanded.                             |
| `hideSubmitButton`         | `boolean`                                                  |          | Hide the built-in card pay button and use your own — see [Your own pay button](#your-own-pay-button). |
| `onCardValidityChanged`    | `(isValid: boolean, isActive: boolean) => void`            |          | Card form state for your own pay button.                                                              |
| `placeholders`             | `object`                                                   |          | Input placeholders — see below.                                                                       |
| `localizations`            | `object`                                                   |          | Override built-in copy per language and key.                                                          |

### Choosing methods

`PaymentMethod` is one of `"card"`, `"storedcard"`, `"googlepay"`, `"applepay"` and `"kortalan"`.
Which ones appear is decided by the session (and the shopper's device, for the wallets);
`allowedPaymentMethods` can only narrow that list.

`orderPaymentMethods` takes the same tokens plus `"instantpayments"` (the express wallet row). The
default order is `["instantpayments", "kortalan", "storedcard", "card", "googlepay", "applepay"]`;
any available method you leave out is appended in that order, so nothing is hidden just by being
omitted. A wallet listed in `instantPayments` only ever renders in the express row.

**Kortalán** is listed by the backend only when the store has it enabled **and** Kortalán accepts
the basket's amount, so it can come and go between sessions. Paying with it redirects the shopper
to Kortalán; handle the return with [`submitDetails`](#returning-from-a-redirect), exactly like a
redirect-based 3-D Secure flow.

### `placeholders`

Any subset of: `cardNumber`, `expiryDate`, `expiryMonth`, `expiryYear`, `securityCodeThreeDigits`,
`securityCodeFourDigits`.

### `localizations`

Override any translation key per language (`"is"` / `"en"`). Provided strings take precedence
over the built-in translations; missing keys fall back to the defaults. The 1.x full tags
(`"is-IS"` / `"en-US"`) are still accepted as keys.

```javascript
localizations: {
  en: { "cards.title": "Card Information" },
  is: { "cards.title": "Kortaupplýsingar" },
}
```

### Theming

Set `theme` to `"light"` (default), `"dark"`, or `"system"`:

```javascript
const checkout = new StraumurCheckout({ sessionId, environment: "test", theme: "system" });
```

To also choose the Google Pay / Apple Pay button styles, pass a `ThemeConfiguration` object. A
button style you omit follows the widget mode (light widget → light button, dark → black):

```javascript
theme: {
  mode: "dark", // "light" | "dark" | "system"
  googlePayButtonTheme: "white", // "dark" | "white"
  applePayButtonTheme: "light", // "dark" | "light"
}
```

`"system"` follows the shopper's OS/browser `prefers-color-scheme` and switches live if they
change it. The theme is scoped to the widget and never affects the surrounding page. Change it at
runtime with `updateConfig({ theme: "dark" })`.

#### Overriding the colors

The widget's colors are CSS custom properties, so you can override any of them. Scope your rule
under your own container element (the one you pass to `mount()`) — that gives it higher specificity
than the built-in styles, so your values win without needing `!important`:

```css
/* Customize the dark theme (target [data-theme="dark"]); drop it to customize light. */
#component-container .straumur__root-component[data-theme="dark"] {
  --straumur__color-white: #101418; /* surfaces / backgrounds */
  --straumur__color-text: #f5f7fa; /* body text */
  --straumur__color-primary: #f5f7fa; /* buttons and accents */
  --straumur__color-secondary: #9aa7b5; /* muted text */
  --straumur__color-border: #2b323b; /* borders */
}
```

The full set of tokens is defined in `src/styles/main.css`. Note: the card number / expiry / CVC
inputs are rendered inside Adyen's secure iframes, which CSS custom properties cannot reach — their
text colors are set internally and won't follow a heavily customized palette.

## Your own pay button

Set `hideSubmitButton: true` to drop the built-in card pay button, render your own, and drive it
with `onCardValidityChanged` and `submitCard()`:

```javascript
const payButton = document.querySelector("#my-pay-button");

const checkout = new StraumurCheckout({
  sessionId,
  environment: "test",
  hideSubmitButton: true,
  // isActive: a card-type method (new or saved card) is selected and ready; hide your button otherwise.
  // isValid: its fields are complete; disable your button until then.
  onCardValidityChanged: (isValid, isActive) => {
    payButton.hidden = !isActive;
    payButton.disabled = !isValid;
  },
});

payButton.addEventListener("click", () => checkout.submitCard());
```

`submitCard()` returns `true` if a card-type method was active and submission started (the outcome
arrives through `onPaymentCompleted` / `onPaymentFailed`), `false` otherwise. Repeated clicks while
a payment is in flight are ignored. The wallets and Kortalán keep their own buttons.

## Returning from a redirect

Some flows leave your page — a redirect-based 3-D Secure challenge, or Kortalán — and come back to
your return URL with `redirectResult` and `paymentCheckoutReference` in the query string. Complete the
payment on that page with `submitDetails`:

```javascript
const params = new URLSearchParams(window.location.search);
const checkout = new StraumurCheckout({ sessionId, environment: "test", onPaymentCompleted, onPaymentFailed });

// The third argument is where to render the result screen; it's only needed if you don't also mount().
checkout.submitDetails(params.get("redirectResult"), params.get("paymentCheckoutReference"), "#component-container");
```

It shows a loader while the result is fetched, then the result screen, and calls your callbacks.

## Accessibility

Payment results are announced to assistive tech (`role="alert"` for failures, `role="status"` for
success), card fields are labelled, the dual-brand selector is keyboard-operable, and focus follows
into a 3-D Secure challenge when it takes over the widget.

## Instance methods

```javascript
const checkout = new StraumurCheckout(config);
```

| Method                                                                | Description                                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `mount(selector)`                                                     | Fetches the payment methods and renders the component into a CSS selector or `HTMLElement`. Async.                               |
| `setLanguage(locale)`                                                 | Switches the UI language at runtime (`"en"` or `"is"`, same codes as the `locale` option).                                       |
| `updateConfig(partial)`                                               | Merges new options (`locale`, `localizations`, `theme`, callbacks, …) and re-renders.                                            |
| `submitDetails(redirectResult, paymentCheckoutReference?, selector?)` | Completes a redirect-based flow (3‑D Secure, Kortalán) — see [Returning from a redirect](#returning-from-a-redirect).            |
| `submitCard()`                                                        | Submits the active card form from your own button; returns whether it started — see [Your own pay button](#your-own-pay-button). |
| `destroy()`                                                           | Unmounts the component and cleans up.                                                                                            |

## Payment result codes

Both callbacks receive a `resultCode`. Following Adyen Web 6 semantics, `Refused`, `Cancelled`,
and `Error` invoke `onPaymentFailed`; every other outcome (`Authorised`, `Received`, `Pending`, …)
invokes `onPaymentCompleted`. `onPaymentFailed` always receives a `resultCode` — if the underlying
provider reports a failure without one, it is delivered as `Error`.

The shopper sees a success screen for `Authorised`, a "being processed" screen for `Pending` /
`Received`, and a failure screen otherwise.

If the Straumur API doesn't answer a payment request within 90 seconds, the shopper is told the
payment couldn't be confirmed and `onPaymentFailed` receives `Error` — but the payment may still have
gone through. Treat the server-side result (your webhook / payment status) as the source of truth
before fulfilling or cancelling an order.

## Breaking changes in v2.0.0

- Removed the config field `submitDetails?: (details: any) => void` (it was never invoked). Use the `submitDetails(redirectResult)` method on the class instead.
- `updateConfig()` accepts only the documented configuration options (typed as `StraumurCheckoutUpdateOptions`). `sessionId` and `environment` are fixed for an instance's lifetime — they are ignored with a console warning; create a new `StraumurCheckout` instead. Use `localizations` (as in the constructor); `customLocalizations` still works but is deprecated.
- `submitDetails(redirectResult)` now invokes `onPaymentCompleted` / `onPaymentFailed`.
- Result routing now follows Adyen Web 6: a `Refused`, `Cancelled`, or `Error` outcome invokes `onPaymentFailed` (in 1.x every gateway response, including refusals, invoked `onPaymentCompleted`). If your integration branched on `resultCode` inside `onPaymentCompleted`, move the failure branches to `onPaymentFailed`.
- `onPaymentFailed`'s argument is no longer optional — it always carries a `resultCode`.
- Locale short codes everywhere: `setLanguage()` and `updateConfig()` now take `"en"` / `"is"` like the constructor's `locale` option. The 1.x full tags (`"en-US"` / `"is-IS"`) are still accepted at runtime but are no longer part of the public types.

## License

MIT
