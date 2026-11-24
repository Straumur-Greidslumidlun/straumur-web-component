# Changelog

## 1.1.7 — 2026-11-24

First stable release since **1.1.3**. It contains every change made after 1.1.3; versions 1.1.4–1.1.6 were
only published as prereleases (`1.1.4-alpha.1`, `1.1.5-alpha.1`, `1.1.6-alpha.1`). No breaking changes: existing
integrations keep working without code changes.

### New features

You can now submit card payments from your own button instead of the built-in one.

| Option / method | Description |
| --- | --- |
| `submitCard(): boolean` | Submits the active card form (new card or stored card). Returns `false` and logs a console warning if the component is not mounted yet, not ready yet, or no card form is active. |
| `hideSubmitButton?: boolean` | Hides the built-in pay button on the card and stored-card forms. Use it together with `submitCard()`. |
| `onCardValidityChanged?: (isValid: boolean, isActive: boolean) => void` | Tells you when the active card form becomes valid or invalid, so you can enable or disable your own button. `isActive` is `false` when no card form is selected. |
| `allowedPaymentMethods?: ("card" \| "storedcard" \| "googlepay" \| "applepay")[]` | Shows only the listed payment methods, even if the session offers more. If you leave it out, every available method is shown. |

```js
const checkout = new StraumurCheckout({
  sessionId,
  environment: "live",
  hideSubmitButton: true,
  allowedPaymentMethods: ["card", "storedcard"],
  onCardValidityChanged: (isValid, isActive) => {
    myPayButton.disabled = !(isValid && isActive);
  },
});
await checkout.mount("#checkout");

myPayButton.addEventListener("click", () => checkout.submitCard());
```

### Bug fixes

- Completing a payment after a redirect with `submitDetails()` no longer fails with an error.
- Changing the language no longer leaves old card-field iframes behind on the page.
- Fixed hook-ordering issues in the card form that could cause errors in rare cases.
- Google Pay and Apple Pay buttons now size correctly in the express payment row.

### Security

- Updated development and build dependencies to fix all reported `npm audit` advisories. The published package
  still depends only on `@adyen/adyen-web` 6.25.0 and `preact`.
