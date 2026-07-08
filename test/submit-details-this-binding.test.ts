import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression test for the `onAdditionalDetails` callback losing its `this` binding.
 *
 * `StraumurCheckout.submitDetails` passes `this.handleOnSubmitAdditionalData` to Adyen
 * unbound. Adyen invokes it as a detached function, so `this` is undefined and every
 * `this.configuration` / `this.handleError` access throws. This test captures the callback
 * Adyen is given, invokes it the same way Adyen would (detached), and asserts it works.
 */

const adyenConfigs: any[] = [];

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    adyenConfigs.push(config);
    return { submitDetails: vi.fn() };
  }),
  CustomCard: vi.fn(),
}));

vi.mock("../src/services/straumur-service", () => ({
  setupPaymentMethods: vi.fn(async () => ({
    resultCode: "Success",
    clientKey: "ck",
    locale: "en-US",
    paymentMethods: { paymentMethods: [], storedPaymentMethods: [] },
  })),
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

describe("StraumurCheckout.submitDetails onAdditionalDetails binding", () => {
  beforeEach(() => {
    adyenConfigs.length = 0;
    vi.mocked(createDetailsRequest).mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("invokes the details request with the session id when Adyen calls the callback detached", async () => {
    const checkout = new StraumurCheckout({ sessionId: "sess-123", environment: "test" });
    await checkout.mount("#root");

    await checkout.submitDetails("redirect-result-abc");

    // Adyen received exactly one checkout config carrying the callback.
    expect(adyenConfigs).toHaveLength(1);
    const onAdditionalDetails = adyenConfigs[0].onAdditionalDetails;
    expect(typeof onAdditionalDetails).toBe("function");

    // Simulate Adyen invoking it as a plain (detached) function reference.
    const detached = onAdditionalDetails;
    const state = { data: { details: { redirectResult: "redirect-result-abc" } } };
    const actions = { resolve: vi.fn(), reject: vi.fn() };

    let thrown: unknown = null;
    try {
      await detached(state, {}, actions);
    } catch (e) {
      thrown = e;
    }

    // With the bug, `this` is undefined and the call throws before reaching the request.
    expect(thrown).toBeNull();
    expect(createDetailsRequest).toHaveBeenCalledWith("test", expect.objectContaining({ sessionId: "sess-123" }));
    expect(actions.resolve).toHaveBeenCalledWith(expect.objectContaining({ resultCode: "Authorised" }));
    expect(actions.reject).not.toHaveBeenCalled();
  });
});
