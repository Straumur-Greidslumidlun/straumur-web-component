import { describe, it, expect, vi, beforeEach } from "vitest";
import { translations, TranslationKey } from "../src/localizations/translations";

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({ submitDetails: vi.fn() })),
  CustomCard: class {},
  GooglePay: class {},
  ApplePay: class {},
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

const setup = vi.mocked(setupPaymentMethods);

const emptySuccess = {
  resultCode: "Success" as const,
  clientKey: "ck",
  locale: "en-US" as const,
  paymentMethods: { paymentMethods: [], storedPaymentMethods: [] },
};

const root = () => document.querySelector("#root")!;
const en = (k: TranslationKey) => translations["en-US"][k as keyof (typeof translations)["en-US"]];
const is = (k: TranslationKey) => translations["is-IS"][k as keyof (typeof translations)["is-IS"]];

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  setup.mockReset();
  setup.mockResolvedValue(emptySuccess as any);
});

describe("StraumurCheckout locale mapping", () => {
  it("defaults to Icelandic when no locale is given", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    await checkout.mount("#root");
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("maps 'en' to en-US", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain(en("error.unknownError"));
  });

  it("maps 'is' to is-IS", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "is" });
    await checkout.mount("#root");
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain(is("error.unknownError"));
  });
});

describe("StraumurCheckout config updates", () => {
  it("switches the active language via updateConfig", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.updateConfig({ locale: "is-IS" });
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("switches the active language via setLanguage", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.setLanguage("is-IS");
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("applies custom localizations passed to updateConfig", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.updateConfig({ customLocalizations: { "en-US": { "error.unknownError": "Custom boom" } } });
    checkout.handleError("error.unknownError");
    expect(root().textContent).toContain("Custom boom");
  });
});

describe("StraumurCheckout.destroy", () => {
  it("empties the mount element", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    await checkout.mount("#root");
    expect(root().innerHTML).not.toBe("");

    checkout.destroy();
    expect(root().innerHTML).toBe("");
  });
});

describe("StraumurCheckout.submitDetails", () => {
  it("renders an error when payment-method setup fails", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    setup.mockResolvedValueOnce({ resultCode: "Error", error: "error.paymentDetailsFailed" } as any);
    await checkout.submitDetails("redirect-result");

    expect(root().textContent).toContain(en("error.paymentDetailsFailed"));
  });
});
