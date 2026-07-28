import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/preact";
import { advancedConfig, scheme } from "./helpers/fixtures";
import { StraumurWebConfiguration } from "../src/models/models";

/**
 * Advanced-mode twin of docs-integration.test.tsx: drives the INTERNAL advanced configuration
 * (used only by Straumur Hosted Checkout) through the real class — constructor detection,
 * immediate mount without a payment-methods fetch, onSubmit/onAdditionalDetails bridging,
 * and the 3DS redirect-return path (submitDetails).
 *
 * Only `@adyen/adyen-web` is mocked; `fetch` is stubbed to prove it is never called.
 */

const A = vi.hoisted(() => {
  const cap: any = { checkout: [], card: [], submitDetails: [] };
  class FakeCustomCard {
    mount = vi.fn();
    unmount = vi.fn();
    submit = vi.fn();
    constructor(_core: unknown, opts: any) {
      cap.card.push(opts);
      opts.onConfigSuccess?.();
    }
  }
  return { cap, FakeCustomCard };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    A.cap.checkout.push(config);
    const submitDetails = vi.fn();
    A.cap.submitDetails.push(submitDetails);
    return { submitDetails };
  }),
  CustomCard: A.FakeCustomCard,
  GooglePay: class {},
  ApplePay: class {},
}));

import StraumurCheckout from "../src/straumur-checkout";

// The public constructor is typed session-only by design; the advanced configuration
// is detected at runtime. Tests cast the same way the hosted checkout page does.
const construct = (config = advancedConfig()) => new StraumurCheckout(config as unknown as StraumurWebConfiguration);

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  A.cap.checkout.length = 0;
  A.cap.card.length = 0;
  A.cap.submitDetails.length = 0;
  document.body.innerHTML = '<div id="component-container"></div>';
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("advanced mode: mount", () => {
  it("renders immediately from the provided payment methods without any network call", async () => {
    const checkout = construct(
      advancedConfig({ paymentMethods: { paymentMethods: [scheme(["visa", "mc"])] }, locale: "en" })
    );

    await checkout.mount("#component-container");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Card number")).toBeTruthy();
  });

  it("renders the failure screen when required advanced fields are missing", async () => {
    const checkout = construct(advancedConfig({ clientKey: "" }));

    await checkout.mount("#component-container");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Failed to initialize Straumur Web component")).toBeTruthy();
  });

  it.each([
    ["countryCode", { countryCode: "" }],
    ["amount", { amount: undefined as never }],
    ["onSubmit", { onSubmit: undefined as never }],
    ["onAdditionalDetails", { onAdditionalDetails: undefined as never }],
  ])("treats a configuration without %s as invalid", async (_field, override) => {
    const checkout = construct(advancedConfig(override as never));

    await checkout.mount("#component-container");

    expect(await screen.findByText("Failed to initialize Straumur Web component")).toBeTruthy();
  });
});

// The card form initializes Adyen asynchronously, so a slow init from an earlier test can land
// in this test's capture array. Select the capture by this test's unique clientKey.
async function captureCheckout(clientKey: string) {
  await waitFor(() => expect(A.cap.checkout.some((c: any) => c.clientKey === clientKey)).toBe(true));
  return A.cap.checkout.find((c: any) => c.clientKey === clientKey);
}

describe("advanced mode: onSubmit bridging", () => {
  it("routes a card submission through the host's onSubmit and shows success on Authorised", async () => {
    const onSubmit = vi.fn((_state, actions) => actions.resolve({ resultCode: "Authorised" }));
    const onPaymentCompleted = vi.fn();
    const checkout = construct(
      advancedConfig({
        clientKey: "ck-authorised",
        paymentMethods: { paymentMethods: [scheme(["visa", "mc"])] },
        locale: "en",
        onSubmit,
        onPaymentCompleted,
      })
    );

    await checkout.mount("#component-container");

    const adyenConfig = await captureCheckout("ck-authorised");
    const actions = { resolve: vi.fn(), reject: vi.fn() };
    await adyenConfig.onSubmit({ data: { paymentMethod: { type: "scheme" } } }, {}, actions);

    expect(onSubmit).toHaveBeenCalledWith(
      { data: { paymentMethod: { type: "scheme" }, storePaymentMethod: false } },
      expect.anything()
    );
    expect(actions.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: undefined });

    // Adyen then reports completion; the widget shows its success screen and notifies the host.
    adyenConfig.onPaymentCompleted({ resultCode: "Authorised" });
    expect(await screen.findByText("Payment authorized")).toBeTruthy();
    expect(onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
  });

  it("shows the host's errorMessage on the failure screen when the payment is refused", async () => {
    const onSubmit = vi.fn((_state, actions) =>
      actions.resolve({ resultCode: "Refused", errorMessage: "Please use a different card" })
    );
    const checkout = construct(
      advancedConfig({
        clientKey: "ck-refused",
        paymentMethods: { paymentMethods: [scheme(["visa", "mc"])] },
        locale: "en",
        onSubmit,
      })
    );

    await checkout.mount("#component-container");

    const adyenConfig = await captureCheckout("ck-refused");
    await adyenConfig.onSubmit(
      { data: { paymentMethod: { type: "scheme" } } },
      {},
      { resolve: vi.fn(), reject: vi.fn() }
    );
    adyenConfig.onPaymentCompleted({ resultCode: "Refused" });

    expect(await screen.findByText("Please use a different card")).toBeTruthy();
  });
});

describe("advanced mode: submitDetails (3DS redirect return)", () => {
  it("routes the redirect result through the host's onAdditionalDetails without bootstrapping Adyen", async () => {
    const onAdditionalDetails = vi.fn((_state, actions) => actions.resolve({ resultCode: "Authorised" }));
    const checkout = construct(advancedConfig({ onAdditionalDetails, clientKey: "ck-adv" }));

    await checkout.submitDetails("redirect-blob", "pcr-adv", "#component-container");

    // Advanced mode hands the continuation (with the per-attempt reference) to the host handler; the
    // component never fetches and never constructs an Adyen checkout for the redirect return.
    expect(onAdditionalDetails).toHaveBeenCalledWith(
      { data: { paymentCheckoutReference: "pcr-adv", details: { redirectResult: "redirect-blob" } } },
      expect.anything()
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(A.cap.checkout.length).toBe(0);
  });

  it("routes the additional details through the host's onAdditionalDetails and shows success", async () => {
    const onAdditionalDetails = vi.fn((_state, actions) => actions.resolve({ resultCode: "Authorised" }));
    const onPaymentCompleted = vi.fn();
    const checkout = construct(advancedConfig({ onAdditionalDetails, onPaymentCompleted, locale: "en" }));

    await checkout.submitDetails("redirect-blob", "pcr-adv", "#component-container");

    expect(await screen.findByText("Payment authorized")).toBeTruthy();
    expect(onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
  });

  it("shows the failure screen and notifies the host when the details are refused", async () => {
    const onAdditionalDetails = vi.fn((_state, actions) =>
      actions.resolve({ resultCode: "Refused", errorMessage: "3DS verification failed" })
    );
    const onPaymentFailed = vi.fn();
    const checkout = construct(advancedConfig({ onAdditionalDetails, onPaymentFailed, locale: "en" }));

    await checkout.submitDetails("redirect-blob", "pcr-adv", "#component-container");

    expect(await screen.findByText("3DS verification failed")).toBeTruthy();
    expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Refused" });
  });

  it("shows the failure screen when called on an invalid advanced configuration", async () => {
    const checkout = construct(advancedConfig({ clientKey: "" }));

    await checkout.submitDetails("redirect-blob", "pcr-adv", "#component-container");

    expect(A.cap.checkout.length).toBe(0);
    expect(await screen.findByText("Failed to initialize Straumur Web component")).toBeTruthy();
  });
});
