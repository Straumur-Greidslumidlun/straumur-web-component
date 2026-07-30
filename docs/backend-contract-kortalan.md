# Backend → component handoff: multi-provider checkout (Adyen + Kortalan)

**Audience:** the web-component (Phase 5) work.
**Companion doc:** [`multi-provider.md`](./multi-provider.md) is the _frontend_ design note ("how to open
the widget to non-Adyen methods"). Kortalan is the concrete non-Adyen method that note calls the
"forcing function." **This** doc is the _backend contract_ it now has to build against — what the backend
actually sends and expects, from code already committed.

**Backend source of truth:** repo `straumur-backend-ai`, branch `feat/unified-checkout-flow-consolidation`,
through commit `a760ed7de`. Backend Phases 1–4 are complete, committed, and green. All field names below
are quoted from committed code; file/line references are given so you can re-derive anything.

**Wire casing:** all responses are serialized **camelCase** (`JsonNamingPolicy.CamelCase`); request bodies
are deserialized **case-insensitively** (`PropertyNameCaseInsensitive = true`,
`Payfac.Shared/Helpers/JsonExtensions.cs`). So every field below is written in its camelCase wire form.

**Status of the contract:** the Kortalan API contract is **provisional** ("not written in stone"). What is
stable is the _component-facing_ shape (payment-methods listing, `/payments` response, `/additional-details`
request) — that is deliberately kept in Adyen's existing dialect so the component needs **no new response
vocabulary** to support Kortalan. The parts still subject to change are backend↔Kortalan internals
(auth, amount units, merchant fields) and do not cross the component boundary. See
[§7 Provisional / assumptions](#7-provisional--assumptions).

---

## 0. The one idea that makes this cheap for the component

**The backend maps Kortalan into Adyen's existing dialect on purpose.** A Kortalan payment comes back as a
`Pending` result carrying an **Adyen-shaped `action: { type: "redirect", url }`** — the exact object the
component already redirects on for other redirect methods. A Kortalan method in the listing appears as a
normal entry with `type: "kortalan"` and no Adyen config. There is **no new `nextAction` field, no new
result envelope** on the wire.

So the component's job for Kortalan is small and mostly reuse:

1. Render a button for the `type: "kortalan"` method (no Adyen SDK element behind it).
2. On a `/payments` response, if `action.type === "redirect"`, redirect to `action.url` — **already how
   redirect actions work.**
3. On return, submit `/additional-details` with the reference the redirect brought back — **the same
   endpoint 3DS already uses**, plus one new field (`paymentCheckoutReference`).

The rest of this doc is the precise field-level detail behind those three steps.

---

## 1. Payment-methods listing — how native (Kortalan) methods appear

### 1.1 Embedded (`GET` payment-methods, `SessionId`)

Backend: `UnifiedEmbeddedCheckoutPaymentMethodsProvider`
(`src/Payfac.Services.Checkout/Handlers/EmbeddedCheckout/Unified/`). Response type
`UnifiedGetEmbeddedCheckoutPaymentMethodsResponse`.

```jsonc
{
  "clientKey": "test_XXXX", // string | ABSENT (null) when the terminal has NO Adyen methods
  "minorUnitsAmount": 199900,
  "formattedAmount": "1.999 kr.",
  "amount": 1999,
  "currency": "ISK",
  "enableStoreDetails": "AskForConsent", // string | null — null when no Adyen methods (Adyen-only concept)
  "locale": "is-IS",
  "merchantName": "Example ehf.",
  "paymentMethods": {
    "paymentMethods": [
      { "type": "scheme", "name": "Cards", "brands": ["visa", "mc"], "configuration": {/* … */} },
      { "type": "kortalan", "name": "Kortalan" }, // ← native method: Type + Name only, no Adyen config
    ],
    "storedPaymentMethods": [/* Adyen stored cards, if any */],
  },
}
```

**What the component keys off:**

- **`clientKey` absence ⇒ do not init the Adyen SDK.** The backend omits `clientKey` (and
  `enableStoreDetails`) whenever the terminal has **no** Adyen-backed methods — i.e. a Kortalan-only
  terminal. This is the explicit signal in the design note's item (3): a native-only terminal must not
  `new AdyenCheckout()`. When `clientKey` is present, at least one Adyen method exists and the SDK is
  needed as today.
- **Native methods are folded into the same `paymentMethods.paymentMethods` array** — there is **no
  separate `nativeMethods` field.** Distinguish them by **`type`**. Native entries carry only:
  - `type` — the stable wire id. For Kortalan this is the literal **`"kortalan"`**
    (`PaymentMethodHelper.MapNativePaymentMethodType`).
  - `name` — display label (`"Kortalan"` today; a localized `[Localize]` key is a backend TODO, so treat
    `name` as display text, not an identifier).
  - `brands`, `configuration` — **absent/null** for native methods (Adyen-only fields).

  So the discriminator is: **`configuration`/`brands` present ⇒ Adyen-backed element; a bare
  `type`+`name` ⇒ native, render your own button.** The open-method-registry in `multi-provider.md §"What
needs to be added"` item 1 is exactly what consumes this — `type` is already an open string on the wire.

### 1.2 Hosted

Hosted is server-rendered (the component is embedded in the Straumur hosted-checkout page, selected by the
`UseStraumurComponents` flag). Its payment-methods data rides the **shared Razor view model**
`GetHostedCheckoutDataResponse` (unchanged nested shape), with native methods folded into its existing
`paymentMethods` list the same way — distinguished by `type`. `clientKey` on the hosted flow stays the
global setting (it is not dropped for native-only the way embedded drops it). If you consume a hosted
payment-methods payload, apply the same rule: **`type: "kortalan"` with no Adyen config ⇒ native button.**

> Backend note: the two channels' payment-methods JSON differ slightly (embedded uses the trimmed
> `UnifiedPaymentMethodsModel`; hosted reuses its original nested DTO). Both nonetheless expose native
> methods as a listed entry keyed by `type`.

---

## 2. `/payments` response for a Kortalan result (`Pending` → redirect)

Backend: `KortalanPaymentProviderHandler.PayAsync`
(`src/Payfac.Core/Services/PaymentProviders/KortalanPaymentProviderHandler.cs`) produces a normalized
`Pending` result; each channel's `MapResponse` turns it into the component response.

A successful Kortalan `/payments` call returns HTTP **200** with:

```jsonc
{
  "resultCode": "RedirectShopper",
  "action": {
    "type": "redirect",
    "url": "https://checkout.kortalan.example/…", // redirect the shopper here
  },
}
```

- **`resultCode: "RedirectShopper"`** — deliberately Adyen's redirect result code (Kortalan handler constant
  `RedirectResultCode = "RedirectShopper"`), so any existing `resultCode`-based branching treats it like an
  Adyen redirect.
- **`action: { type: "redirect", url }`** — built by each channel `MapResponse` from the neutral
  `NextAction` when there is no Adyen response present (the `_adyenResponse is null` branch in
  `UnifiedHostedCheckoutPaymentProvider.MapResponse` / `UnifiedEmbeddedCheckoutPaymentProvider.MapResponse`).
  For the embedded response the `action` object carries **only `type` and `url`** (no `paymentData`,
  `token`, etc. — those are Adyen-challenge fields and stay null for Kortalan).

**Component action:** identical to how you already handle a redirect action — send the shopper to
`action.url`. Do **not** expect `paymentData`/3DS fields on a Kortalan action; it is a plain browser
redirect, not an Adyen challenge.

> Reminder (from CLAUDE.md): the backend returns **200 even for refused/failed payments** — branch on
> `resultCode`/`action`, never HTTP status. A Kortalan call that fails _before_ the redirect (no redirect
> URL from Kortalan) comes back with `success:false` internally and surfaces to you as a non-authorised
> result with no `action` — treat as failure, same as a refused Adyen payment.

### Outcome model (backend-internal, for your mental model)

The backend's neutral `ExternalPaymentOutcome` is `{ Authorised, Refused, Pending, Error }`. `Pending` is
what releases the checkout lock and drives the redirect. You never see this enum on the wire — you see
`resultCode` + `action` — but it explains why a Kortalan payment "pauses": the checkout goes back to `New`
(payable) while the shopper is at Kortalan, and is finalized only when `/additional-details` is submitted on
return.

---

## 3. The return-URL query contract

When the backend calls Kortalan, it passes a **return URL** that Kortalan will redirect the shopper back to.
Two things ride that URL; both must survive the round-trip back to the component:

| Param                      | Who sets it                              | Meaning                                                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paymentCheckoutReference` | **Straumur backend** appends it          | The **per-attempt** reference (`UnifiedCheckoutEvent.CheckoutReference`, minted at `/payments`). Identifies _which payment attempt_ this return belongs to. **The component must send this back on `/additional-details`.** |
| Kortalan's own reference   | **Kortalan** appends it on redirect-back | Kortalan's payment reference. The component forwards it to `/additional-details` as **`details.redirectResult`** (see §4). The backend submits it to Kortalan to confirm.                                                   |

- The `paymentCheckoutReference` is a **per-attempt** value, not the checkout reference. A single checkout
  can have multiple payment attempts (shopper backs out, retries with a different method); the backend uses
  `paymentCheckoutReference` to recover _which provider handled this attempt_. Losing it means the backend
  cannot route the continuation and hard-fails ("Payment provider could not be determined for this
  checkout.").
- **The exact query-param name Kortalan uses for its own reference is provisional.** The backend reads it
  from the component as `details.redirectResult` (§4) — i.e. the component is responsible for taking whatever
  Kortalan appended and placing it into `details.redirectResult`. Confirm the Kortalan-side param name with
  the Kortalan integration before wiring; on the backend side only `redirectResult` matters.

> This mirrors Adyen 3DS exactly: Adyen 3DS **also** returns via `/additional-details`, and the backend now
> appends `paymentCheckoutReference` to the **Adyen** return URL too (commit `977653b14`). So
> `paymentCheckoutReference` is present on the return for **both** providers — build the component's return
> handling once, for both.

---

## 4. `/additional-details` request — what the component sends

`/additional-details` is the **shared, provider-routed continuation** endpoint for **both** Adyen 3DS and
Kortalan redirect-return. The backend recovers the provider from `paymentCheckoutReference` and routes to
the right handler — the component sends the **same shape** regardless of provider.

Backend request models:

- Hosted: `HostedCheckoutAdditionalDetailsRequest` (extends `AdyenAdditionalDetailsModel`)
- Embedded: `EmbeddedCheckoutAdditionalDetailsRequest` (extends `AdyenAdditionalDetailsModel`)
- Shared `details` shape: `AdyenAdditionalDetailsThreeDsResultModel`
  (`src/Payfac.Core/Types/Contracts/Checkout/Adyen/AdyenAdditionalDetailsRequest.cs`)

### 4.1 Hosted `/additional-details`

```jsonc
{
  "checkoutReference": "<initial checkout reference>", // required — identifies the UnifiedCheckout
  "paymentCheckoutReference": "<per-attempt ref>", // required — from the return URL (see §3)
  "details": {
    "threeDSResult": "<adyen 3DS result>", // present for Adyen 3DS; null for Kortalan
    "redirectResult": "<kortalan ref>", // present for Kortalan; also used by Adyen redirect-3DS
  },
}
```

### 4.2 Embedded `/additional-details`

```jsonc
{
  "sessionId": "<embedded session id>", // required — identifies the UnifiedCheckout
  "paymentCheckoutReference": "<per-attempt ref>", // required — from the return URL (see §3)
  "details": {
    "threeDSResult": "<adyen 3DS result>",
    "redirectResult": "<kortalan ref>",
  },
}
```

**Key points:**

- **`paymentCheckoutReference` is new and required for routing.** Without it the backend cannot determine
  the provider and returns a handled error. It is nullable in the C# model only so the backend can throw a
  clean localized error rather than a 400 — the component must always send it on a redirect return.
- The channel key differs: **hosted sends `checkoutReference`, embedded sends `sessionId`** (same as their
  respective `/payments` calls).
- **`details`** is the Adyen-shaped continuation object. For Kortalan, put Kortalan's returned reference in
  **`details.redirectResult`**; leave `threeDSResult` null. The backend's Kortalan handler
  (`SubmitDetailsAsync`) reads `details.redirectResult` and confirms with Kortalan.
- **Both `threeDSResult` and `redirectResult` are forwarded for Adyen too.** The backend no longer drops
  `redirectResult` on the embedded channel (an earlier oversight; fixed — both channels forward all 3DS
  continuation data). So the component can populate `details` uniformly from whatever the return carried.

### 4.3 `/additional-details` response for Kortalan

On confirm, the Kortalan handler maps `AUTHORIZED → Authorised`, anything else → `Refused` (Adyen dialect),
and the channel `MapResponse` native branch returns:

```jsonc
// Hosted (AdditionalDetailsResponse)
{ "resultCode": "Authorised", "pspReference": "<kortalan ref>" }

// Embedded (CreateEmbeddedCheckoutAdditionalDetailsResponse)
{ "resultCode": "Authorised", "payfacReference": "<kortalan ref>", "responseIdentifier": "<guid>" }
```

`resultCode` is `"Authorised"` or `"Refused"` — branch exactly as you do for an Adyen `/additional-details`
result. Note the reference field name differs by channel (`pspReference` hosted vs `payfacReference`
embedded), matching the existing per-channel Adyen responses.

---

## 5. Hosted vs embedded return handling

The redirect-return **entry point** differs by channel; the `/additional-details` **call** is the same.

### 5.1 Hosted — page reload with `redirect=true`

- The Kortalan return URL is the **Straumur hosted-checkout page** for the **initial** checkout reference,
  built from `GenerateHostedCheckoutUrl(...).ThreeDSUrl`, which carries **`redirect=true`**, plus the
  appended `paymentCheckoutReference`. Concretely:

  ```
  https://<hosted-checkout-host>/<segment>/<INITIAL checkoutReference>?redirect=true&paymentCheckoutReference=<PER-ATTEMPT ref>
  ```

  (The query param is named **`redirect`**, not `threeDS` — renamed in commit `16d001db4`; the
  `HostedCheckoutController` reads a `redirect` boolean off the return URL.)

- **Flow:** Kortalan redirects the browser to that URL → the hosted page **reloads** in return mode
  (`redirect=true`) → the embedded component, on load, detects the return and **POSTs `/additional-details`**
  itself (hosted `checkoutReference` + `paymentCheckoutReference` + `details.redirectResult`). This is the
  hosted analog of the existing 3DS-return page load.
- The component must read `paymentCheckoutReference` (and Kortalan's reference) off the **page URL** on load
  and place them into the `/additional-details` request per §4.1.

### 5.2 Embedded — merchant drives `submitDetails`

- Embedded has no Straumur page. The Kortalan return URL is the **merchant's own** `threeDSReturnUrl` (from
  the initial embedded request), plus the appended `paymentCheckoutReference`:

  ```
  <merchant threeDSReturnUrl>?…&paymentCheckoutReference=<PER-ATTEMPT ref>
  ```

- **Flow:** Kortalan redirects to the merchant's return page → the merchant calls the component's
  **`submitDetails(redirectDetails, paymentCheckoutReference)`** → the component POSTs `/additional-details`
  (embedded `sessionId` + `paymentCheckoutReference` + `details.redirectResult`) per §4.2.
- This matches the existing embedded 3DS-return contract (`straumur-checkout.tsx` already exposes
  `submitDetails`). The **new** part is threading `paymentCheckoutReference` through `submitDetails` and into
  the request body. Decide the public signature — e.g. accept it as part of `redirectDetails` or as a second
  argument — and document it for merchants.

---

## 6. End-to-end sequence (Kortalan, both channels)

```
1. Listing:   paymentMethods contains { type:"kortalan", name:"Kortalan" }.
              clientKey ABSENT ⇒ Kortalan-only terminal ⇒ no Adyen SDK.
2. Select:    shopper taps Kortalan → component renders its own button (no Adyen element).
3. Pay:       component POSTs /payments with paymentMethod.type = "kortalan".
              ← 200 { resultCode:"RedirectShopper", action:{ type:"redirect", url } }
              Backend has: recorded ProviderType=Kortalan on the attempt, released the checkout to New.
4. Redirect:  component redirects shopper to action.url (Kortalan).
5. Return:    Kortalan redirects back to the return URL carrying paymentCheckoutReference + its own ref.
              Hosted  → page reloads (redirect=true); component auto-POSTs /additional-details.
              Embedded→ merchant calls component.submitDetails(redirectDetails, paymentCheckoutReference).
6. Confirm:   /additional-details { <channel key>, paymentCheckoutReference, details.redirectResult }.
              Backend routes by paymentCheckoutReference → Kortalan handler → confirms with Kortalan.
              ← 200 { resultCode:"Authorised"|"Refused", <ref field> }
7. Result:    component shows success/failure exactly as for an Adyen /additional-details result.
```

The Adyen 3DS path is the same sequence with `details.threeDSResult` instead of `redirectResult` and an
Adyen challenge instead of a browser redirect at steps 3–4.

---

## 7. Provisional / assumptions

These are backend-side and **do not change the component contract above**, but flag them when coordinating
with the Kortalan integration and merchant setup:

- **Kortalan API is provisional** ("not written in stone"). `POST /payments` and
  `POST /payments/additional-details` shapes, and **auth (currently a placeholder — none specified)**, may
  change. None of that crosses the component boundary.
- **Kortalan's return query-param name** for its own reference is unconfirmed — the component maps it into
  `details.redirectResult`; confirm the source param name with Kortalan.
- **Amount** is sent to Kortalan as `(long)` **ISK** (no minor units). If Kortalan ever handles decimal
  currencies this needs revisiting — not a component concern, but affects amounts if the assumption is wrong.
- **Merchant name/ssn/mcc** are sourced from `LegalEntity.Name` / `LegalEntity.Ssn` / `Store.Mcc`. Merchant
  onboarding for Kortalan must ensure these are populated.
- **`name`/label localization** for the native method is a backend TODO (`[Localize]` key not yet added);
  today `name` is the enum name (`"Kortalan"`). Treat `type` (not `name`) as the stable identifier.

---

## 8. Quick reference — backend files

| Concern                                                                                | File (in `straumur-backend-ai/src`)                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native-method classification / wire id (`"kortalan"`)                                  | `Payfac.Core/Helpers/PaymentMethodHelper.cs`                                                                                                                                                                      |
| Method → provider routing (`"scheme"→Adyen`, `"kortalan"→Kortalan`, hard-fail unknown) | `Payfac.Core/Helpers/PaymentProviderResolver.cs`                                                                                                                                                                  |
| Embedded payment-methods listing (clientKey omission, native fold-in)                  | `Payfac.Services.Checkout/Handlers/EmbeddedCheckout/Unified/UnifiedEmbeddedCheckoutPaymentMethodsProvider.cs`                                                                                                     |
| Shared listing model                                                                   | `Payfac.Core/Types/Contracts/Checkout/UnifiedPaymentMethodsModel.cs`                                                                                                                                              |
| Kortalan `/payments` + `/additional-details` handler                                   | `Payfac.Core/Services/PaymentProviders/KortalanPaymentProviderHandler.cs`                                                                                                                                         |
| Neutral next-action model                                                              | `Payfac.Adapters/PaymentProviders/NextAction.cs`                                                                                                                                                                  |
| `/payments` response mapping (hosted / embedded)                                       | `Payfac.Services.HostedCheckout/…/Unified/UnifiedHostedCheckoutPaymentProvider.cs`, `Payfac.Services.Checkout/…/Unified/UnifiedEmbeddedCheckoutPaymentProvider.cs`                                                |
| `/additional-details` request models                                                   | `Payfac.Core/Types/Contracts/Checkout/Adyen/HostedCheckout/HostedCheckoutAdditionalDetailsRequest.cs`, `…/Adyen/Embedded/EmbeddedCheckoutAdditionalDetailsRequest.cs`, `…/Adyen/AdyenAdditionalDetailsRequest.cs` |
| `/additional-details` response mapping                                                 | `…/Unified/UnifiedHostedCheckoutDetailsProvider.cs`, `…/Unified/UnifiedEmbeddedCheckoutAdditionalDetailsProvider.cs`                                                                                              |
| Return-URL construction (channels + Adyen append)                                      | payment providers above; `Payfac.Core/Services/LinkGeneratorService.cs`, `AdyenCheckoutService.cs`                                                                                                                |
