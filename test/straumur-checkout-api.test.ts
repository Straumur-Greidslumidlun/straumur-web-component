import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/preact";
import { translations, TranslationKey } from "../src/localizations/translations";

const A = vi.hoisted(() => {
  const cap: any = { card: [], instances: [] };
  class FakeCustomCard {
    mount = vi.fn();
    unmount = vi.fn();
    submit = vi.fn();
    constructor(_core: unknown, opts: any) {
      cap.card.push(opts);
      cap.instances.push(this);
      opts.onConfigSuccess?.();
    }
  }
  return { cap, FakeCustomCard };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({ submitDetails: vi.fn() })),
  CustomCard: A.FakeCustomCard,
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
  A.cap.card.length = 0;
  A.cap.instances.length = 0;
});

describe("StraumurCheckout locale mapping", () => {
  it("defaults to Icelandic when no locale is given", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    await checkout.mount("#root");
    checkout.handleError({ key: "error.unknownError" });
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("maps 'en' to en-US", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");
    checkout.handleError({ key: "error.unknownError" });
    expect(root().textContent).toContain(en("error.unknownError"));
  });

  it("maps 'is' to is-IS", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "is" });
    await checkout.mount("#root");
    checkout.handleError({ key: "error.unknownError" });
    expect(root().textContent).toContain(is("error.unknownError"));
  });
});

describe("StraumurCheckout config updates", () => {
  it("switches the active language via updateConfig", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.updateConfig({ locale: "is-IS" });
    checkout.handleError({ key: "error.unknownError" });
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("switches the active language via setLanguage", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.setLanguage("is-IS");
    checkout.handleError({ key: "error.unknownError" });
    expect(root().textContent).toContain(is("error.unknownError"));
  });

  it("applies custom localizations passed to updateConfig", async () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    checkout.updateConfig({ customLocalizations: { "en-US": { "error.unknownError": "Custom boom" } } });
    checkout.handleError({ key: "error.unknownError" });
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

describe("StraumurCheckout.submitCard", () => {
  const cardOnlySuccess = {
    ...emptySuccess,
    paymentMethods: { paymentMethods: [{ type: "scheme", name: "Cards", brands: ["visa"] }], storedPaymentMethods: [] },
  };

  it("returns false and warns when called before the component is mounted", () => {
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(checkout.submitCard()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns false and warns when no card-type payment method is active/initialized yet", async () => {
    setup.mockResolvedValueOnce({
      ...emptySuccess,
      paymentMethods: {
        // Card + a stored card -> more than one option, so neither is auto-selected as sole.
        paymentMethods: [{ type: "scheme", name: "Cards", brands: ["visa"] }],
        storedPaymentMethods: [{ type: "scheme", name: "VISA", brand: "visa", id: "stored-1", lastFour: "1234" }],
      },
    } as any);
    const checkout = new StraumurCheckout({ sessionId: "s1", environment: "test", locale: "en" });
    await checkout.mount("#root");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(checkout.submitCard()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("triggers the active card form's Adyen submit once it's the sole, initialized method", async () => {
    setup.mockResolvedValueOnce(cardOnlySuccess as any);
    const checkout = new StraumurCheckout({
      sessionId: "s1",
      environment: "test",
      locale: "en",
      hideSubmitButton: true,
    });
    await checkout.mount("#root");

    await waitFor(() => expect(A.cap.instances.length).toBeGreaterThan(0));
    // The submit handler registers on a follow-up render after Adyen reports init success -
    // retry submitCard() until the registration effect has had a chance to run.
    await waitFor(() => expect(checkout.submitCard()).toBe(true));
    expect(A.cap.instances[0].submit).toHaveBeenCalledTimes(1);
  });
});
