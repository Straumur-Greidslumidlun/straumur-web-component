import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/preact";
import { makePaymentMethods, scheme, googlePayMethod, applePayMethod } from "./helpers/fixtures";

/**
 * End-to-end smoke test of the exact integration documented at
 * https://docs.straumur.is (Straumur Components -> Web Integration):
 *
 *   const checkout = new StraumurCheckout(paymentConfiguration);
 *   checkout.mount("#component-container");
 *
 * Only the two real external boundaries are mocked:
 *   - `fetch` (the /payment-methods network call)
 *   - `@adyen/adyen-web` (renders secure iframes / probes wallet availability)
 * Everything in between (adapter -> service -> mount -> container -> components) runs for real.
 */

const A = vi.hoisted(() => {
  class FakeCustomCard {
    mount = vi.fn();
    unmount = vi.fn();
    constructor(_c: unknown, opts: any) {
      opts.onConfigSuccess?.();
    }
  }
  class FakeWallet {
    mount = vi.fn();
    remove = vi.fn();
    constructor(_c: unknown, _o: any) {}
    isAvailable() {
      return Promise.resolve();
    }
  }
  return { FakeCustomCard, FakeWallet };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({})),
  CustomCard: A.FakeCustomCard,
  GooglePay: A.FakeWallet,
  ApplePay: A.FakeWallet,
}));

import StraumurCheckout from "../src/straumur-checkout";

// A realistic /payment-methods response body (what the backend returns).
const paymentMethodsBody = makePaymentMethods({
  paymentMethods: { paymentMethods: [scheme(["visa", "mc"]), googlePayMethod(), applePayMethod()] },
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = '<div id="component-container"></div>';
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: async () => paymentMethodsBody,
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Documented integration (new StraumurCheckout(...).mount())", () => {
  it("fetches payment methods and renders the checkout from a documented config", async () => {
    const onPaymentCompleted = vi.fn();
    const onPaymentFailed = vi.fn();

    const paymentConfiguration = {
      environment: "test" as const,
      sessionId: "ftsdre3h-e5h5as2q4",
      onPaymentCompleted,
      onPaymentFailed,
      locale: "en" as const,
      instantPayments: ["applepay", "googlepay"] as ["applepay", "googlepay"],
      placeholders: { cardNumber: "1234 5678 9012 3456" },
      localizations: { "en-US": { "cards.title": "Card Information" } },
    };

    const checkout = new StraumurCheckout(paymentConfiguration);
    await checkout.mount("#component-container");

    // The session id was sent to the /payment-methods endpoint on the staging host.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout/payment-methods");
    expect(JSON.parse(init.body)).toEqual({ sessionId: "ftsdre3h-e5h5as2q4" });

    // The merchant's custom localization for cards.title is applied...
    expect(await screen.findByText("Card Information")).toBeTruthy();
    // ...the card form is rendered...
    expect(screen.getByText("Card number")).toBeTruthy();
    // ...and both configured wallets appear in the instant-payments strip.
    await waitFor(() =>
      expect(document.querySelector(".instant-payments")).toBeTruthy()
    );

    // The loader placeholder is gone (real content mounted).
    expect(document.querySelector("#component-container")!.textContent).not.toBe("");
  });

  it("renders a localized error when the backend rejects the request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      headers: { get: () => "application/json" },
      json: async () => ({ errorMessage: "error.failedToInitializePaymentMethods" }),
    });

    const checkout = new StraumurCheckout({ sessionId: "bad", environment: "test", locale: "en" });
    await checkout.mount("#component-container");

    expect(await screen.findByText("Failed to initialize payment methods")).toBeTruthy();
  });
});
