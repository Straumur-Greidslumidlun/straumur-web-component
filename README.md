# straumur-web-component

An embeddable, PCI-friendly checkout component for accepting card, Google Pay, and Apple Pay
payments through [Straumur](https://straumur.is). It renders a complete payment UI into an element
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
    "en-US": {
      "cards.title": "Card Information",
    },
  },
};

const checkout = new StraumurCheckout(paymentConfiguration);
checkout.mount("#component-container");
```

### Using the CDN / script tag (no bundler)

The package also ships an IIFE build that exposes a global `StraumurWeb`:

```html
<div id="component-container"></div>
<script src="https://unpkg.com/straumur-web-component"></script>
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

| Option               | Type                             | Required | Description                                                               |
| -------------------- | -------------------------------- | :------: | ------------------------------------------------------------------------- |
| `sessionId`          | `string`                         |    ✅    | The session id from your `/embeddedcheckout/session` response.            |
| `environment`        | `"test" \| "live"`               |    ✅    | Selects the Straumur staging or production backend.                       |
| `locale`             | `"is" \| "en"`                   |          | UI language. Defaults to Icelandic (`is`).                                |
| `onPaymentCompleted` | `(data: { resultCode }) => void` |          | Called when the payment flow completes (see result codes below).          |
| `onPaymentFailed`    | `(data: { resultCode }) => void` |          | Called when the payment flow fails (see result codes below).              |
| `instantPayments`    | `("googlepay" \| "applepay")[]`  |          | Renders the listed wallets as express buttons above the standard methods. |
| `placeholders`       | `object`                         |          | Input placeholders — see below.                                           |
| `localizations`      | `object`                         |          | Override built-in copy per language and key.                              |

### `placeholders`

Any subset of: `cardNumber`, `expiryDate`, `expiryMonth`, `expiryYear`, `securityCodeThreeDigits`,
`securityCodeFourDigits`.

### `localizations`

Override any translation key per locale (`"is-IS"` / `"en-US"`). Provided strings take precedence
over the built-in translations; missing keys fall back to the defaults.

```javascript
localizations: {
  "en-US": { "cards.title": "Card Information" },
  "is-IS": { "cards.title": "Kortaupplýsingar" },
}
```

## Instance methods

```javascript
const checkout = new StraumurCheckout(config);
```

| Method                  | Description                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `mount(selector)`       | Fetches the payment methods and renders the component into a CSS selector or `HTMLElement`. Async. |
| `setLanguage(locale)`   | Switches the UI language at runtime (e.g. `"en-US"`, `"is-IS"`).                                   |
| `updateConfig(partial)` | Merges new configuration and re-renders.                                                           |
| `submitDetails(result)` | Completes a redirect-based (e.g. 3‑D Secure) flow using the `redirectResult` from the return URL.  |
| `destroy()`             | Unmounts the component and cleans up.                                                              |

## Payment result codes

Both callbacks receive a `resultCode`. Following Adyen Web 6 semantics, `Refused`, `Cancelled`,
and `Error` invoke `onPaymentFailed`; every other outcome (`Authorised`, `Received`, `Pending`, …)
invokes `onPaymentCompleted`. `onPaymentFailed` always receives a `resultCode` — if the underlying
provider reports a failure without one, it is delivered as `Error`.

## Breaking changes in v2.0.0

- Removed the config field `submitDetails?: (details: any) => void` (it was never invoked). Use the `submitDetails(redirectResult)` method on the class instead.
- `updateConfig()` accepts only the documented configuration fields.
- `submitDetails(redirectResult)` now invokes `onPaymentCompleted` / `onPaymentFailed`.
- Result routing now follows Adyen Web 6: a `Refused`, `Cancelled`, or `Error` outcome invokes `onPaymentFailed` (in 1.x every gateway response, including refusals, invoked `onPaymentCompleted`). If your integration branched on `resultCode` inside `onPaymentCompleted`, move the failure branches to `onPaymentFailed`.
- `onPaymentFailed`'s argument is no longer optional — it always carries a `resultCode`.

## License

MIT
