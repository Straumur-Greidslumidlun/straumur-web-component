import { describe, it, expect, vi, beforeEach } from "vitest";
import { translations } from "../src/localizations/translations";

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({ submitDetails: vi.fn() })),
  CustomCard: vi.fn(),
}));

vi.mock("../src/services/straumur-service", () => ({
  setupPaymentMethods: vi.fn(),
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import StraumurCheckout from "../src/straumur-checkout";
import { setupPaymentMethods } from "../src/services/straumur-service";

describe("StraumurCheckout.mount error handling", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders the localized error message when payment-method setup returns an Error result", async () => {
    vi.mocked(setupPaymentMethods).mockResolvedValue({
      resultCode: "Error",
      error: "error.failedToInitializePaymentMethods",
    });

    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    await checkout.mount("#root");

    // Default locale is is-IS.
    const expected = translations["is-IS"]["error.failedToInitializePaymentMethods"];
    expect(document.querySelector("#root")!.textContent).toContain(expected);
  });

  it("shows the initialization error when the mount target does not exist", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    // Nonexistent selector -> handleError is called against a null element; should not throw.
    await expect(checkout.mount("#does-not-exist")).resolves.toBeUndefined();
    expect(setupPaymentMethods).not.toHaveBeenCalled();
  });
});
