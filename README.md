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
    console.info("Payment failed", data?.resultCode);
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

The package also ships an IIFE build that exposes a global `StraumurWeb`, plus an ESM build you can
import directly from a `<script type="module">`. Both are published to Straumur's CDN on every
GitHub Release, under an immutable, version-pinned path (recommended for production) and a mutable
`latest/` path.

**IIFE bundle** — exposes the global `StraumurWeb`:

```html
<div id="component-container"></div>
<script
  src="https://<your-cdn-domain>/libs/straumur-web-component/<version>/index.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
<script>
  const checkout = new StraumurWeb.StraumurCheckout({
    environment: "test",
    sessionId: "ftsdre3h...e5h5as2q4",
  });
  checkout.mount("#component-container");
</script>
```

**ESM module:**

```html
<div id="component-container"></div>
<script type="module">
  import { StraumurCheckout } from "https://<your-cdn-domain>/libs/straumur-web-component/<version>/index.mjs";

  const checkout = new StraumurCheckout({
    environment: "test",
    sessionId: "ftsdre3h...e5h5as2q4",
  });
  checkout.mount("#component-container");
</script>
```

The exact versioned URL and the matching [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
(`integrity`) hash for each release are printed in that release's GitHub Actions run summary (the
"Publish Package to CDN" workflow). Always pin to a specific version with its SRI hash in
production; the `latest/` path is convenient for testing but is not integrity-pinned.

The npm package is also available from public CDNs such as `https://unpkg.com/straumur-web-component`,
which is handy for quick prototypes but is not covered by Straumur's availability guarantees.

## Configuration

Passed to the `StraumurCheckout` constructor:

| Option               | Type                                      | Required | Description                                                                 |
| -------------------- | ----------------------------------------- | :------: | --------------------------------------------------------------------------- |
| `sessionId`          | `string`                                  |    ✅    | The session id from your `/embeddedcheckout/session` response.              |
| `environment`        | `"test" \| "live"`                        |    ✅    | Selects the Straumur staging or production backend.                         |
| `locale`             | `"is" \| "en"`                            |          | UI language. Defaults to Icelandic (`is`).                                  |
| `onPaymentCompleted` | `(data: { resultCode }) => void`          |          | Called when the payment flow completes (see result codes below).           |
| `onPaymentFailed`    | `(data?: { resultCode }) => void`         |          | Called when the payment flow fails.                                         |
| `instantPayments`    | `("googlepay" \| "applepay")[]`           |          | Renders the listed wallets as express buttons above the standard methods.  |
| `placeholders`       | `object`                                  |          | Input placeholders — see below.                                            |
| `localizations`      | `object`                                  |          | Override built-in copy per language and key.                               |

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

| Method                     | Description                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `mount(selector)`          | Fetches the payment methods and renders the component into a CSS selector or `HTMLElement`. Async.  |
| `setLanguage(locale)`      | Switches the UI language at runtime (e.g. `"en-US"`, `"is-IS"`).                                    |
| `updateConfig(partial)`    | Merges new configuration and re-renders.                                                            |
| `submitDetails(result)`    | Completes a redirect-based (e.g. 3‑D Secure) flow using the `redirectResult` from the return URL.   |
| `destroy()`                | Unmounts the component and cleans up.                                                               |

## Payment result codes

`onPaymentCompleted` / `onPaymentFailed` receive a `resultCode` such as `Authorised`, `Refused`,
`ChallengeShopper`, `IdentifyShopper`, `Error`, or `Cancelled`. Note that a refused payment is a
normal completion of the flow — branch on `resultCode`, not on whether a callback fired.

## License

MIT
