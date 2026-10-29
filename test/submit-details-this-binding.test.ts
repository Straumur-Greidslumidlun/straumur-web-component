import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The redirect return (submitDetails) must complete WITHOUT the Adyen SDK or a clientKey, so a
 * native-only terminal (e.g. Kortalán) can finish its payment. It posts /additional-details
 * directly through the flow, carrying the per-attempt reference the backend routes on.
 */

const adyenCalls: any[] = [];

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    adyenCalls.push(config);
    return { submitDetails: vi.fn() };
  }),
  CustomCard: vi.fn(),
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(async () => ({
    ok: true,
    json: async () => ({ resultCode: "Authorised", action: null }),
  })),
  postDisableTokenRequest: vi.fn(),
}));

import StraumurCheckout from "../src/straumur-checkout";
import { createDetailsRequest } from "../src/adapter/straumur-adapter";

describe("StraumurCheckout.submitDetails without Adyen (native-only redirect return)", () => {
  beforeEach(() => {
    adyenCalls.length = 0;
    vi.mocked(createDetailsRequest).mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("posts the details directly and never constructs an Adyen checkout", async () => {
    const onPaymentCompleted = vi.fn();
    const checkout = new StraumurCheckout({ sessionId: "sess-123", environment: "test", onPaymentCompleted });

    await checkout.submitDetails("redirect-result-abc", "pcr-9", "#root");

    expect(createDetailsRequest).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({
        sessionId: "sess-123",
        paymentCheckoutReference: "pcr-9",
        details: { redirectResult: "redirect-result-abc" },
      })
    );
    // No clientKey was ever needed — the Adyen SDK must not be constructed on the redirect return.
    expect(adyenCalls).toHaveLength(0);
    expect(onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
  });
});
