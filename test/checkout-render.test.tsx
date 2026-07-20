import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/preact";

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

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import StraumurCheckoutContainer from "../src/features/straumur-checkout-container";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import {
  baseConfig,
  makePaymentMethods,
  scheme,
  googlePayMethod,
  applePayMethod,
  storedCard,
} from "./helpers/fixtures";

function renderCheckout(paymentMethods: any, config = baseConfig()) {
  return render(
    <I18nProvider i18nService={new I18nService("en-US")}>
      <StraumurCheckoutContainer configuration={config} paymentMethods={paymentMethods} />
    </I18nProvider>
  );
}

const radios = (c: Element) => c.querySelectorAll('input[type="radio"]');

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StraumurCheckoutContainer rendering", () => {
  it("renders a sole card form (no chooser) when card is the only method", () => {
    const { container } = renderCheckout(makePaymentMethods({ paymentMethods: { paymentMethods: [scheme()] } }));
    expect(screen.getByText("Card number")).toBeTruthy();
    expect(radios(container).length).toBe(0);
  });

  it("renders selectable options when several methods are available", () => {
    const { container } = renderCheckout(
      makePaymentMethods({
        paymentMethods: { paymentMethods: [scheme(), googlePayMethod(), applePayMethod()] },
      })
    );
    expect(screen.getByText("Card payment")).toBeTruthy();
    expect(screen.getByText("Google Pay")).toBeTruthy();
    expect(screen.getByText("Apple Pay")).toBeTruthy();
    // Multiple options -> radio selectors are rendered.
    expect(radios(container).length).toBeGreaterThan(0);
  });

  it("renders stored cards alongside the card option", () => {
    renderCheckout(
      makePaymentMethods({
        paymentMethods: { paymentMethods: [scheme()], storedPaymentMethods: [storedCard()] },
      })
    );
    expect(screen.getByText("•••• 1234")).toBeTruthy();
    expect(screen.getByText("Card payment")).toBeTruthy();
  });

  it("renders standalone payment methods in the configured order", () => {
    const { container } = renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod(), applePayMethod()] } }),
      baseConfig({ orderPaymentMethods: ["googlepay", "card", "applepay"] })
    );

    const titles = Array.from(container.querySelectorAll(".straumur__payment-method-item--title")).map(
      (x) => x.textContent
    );
    expect(titles).toEqual(["Google Pay", "Card payment", "Apple Pay"]);
  });

  it("keeps a configured instant-payment wallet out of the standalone order (instantpayments example)", async () => {
    const { container } = renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod(), applePayMethod()] } }),
      baseConfig({
        orderPaymentMethods: ["card", "googlepay", "instantpayments"],
        instantPayments: ["googlepay", "applepay"],
      })
    );

    await waitFor(() => expect(container.querySelector(".instant-payments")).toBeTruthy());
    // googlepay + applepay live only in the instant strip, never as standalone chooser rows...
    expect(screen.queryByText("Google Pay")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
    // ...and card still renders as a standard method.
    expect(screen.getByText("Card number")).toBeTruthy();
  });

  it("opens the requested payment method on load (openDefaultPaymentMethod)", () => {
    renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod()] } }),
      baseConfig({ openDefaultPaymentMethod: "googlepay" })
    );

    const gpayRadio = screen.getByText("Google Pay").closest("label")?.querySelector('input[type="radio"]');
    expect((gpayRadio as HTMLInputElement).checked).toBe(true);
  });

  it("opens the first stored card when openDefaultPaymentMethod is firstStoredCard", () => {
    renderCheckout(
      makePaymentMethods({
        paymentMethods: { paymentMethods: [scheme()], storedPaymentMethods: [storedCard()] },
      }),
      baseConfig({ openDefaultPaymentMethod: "firstStoredCard" })
    );

    const storedRadio = screen.getByText("•••• 1234").closest("label")?.querySelector('input[type="radio"]');
    expect((storedRadio as HTMLInputElement).checked).toBe(true);
  });

  it("moves a configured wallet into the instant-payments strip and keeps card as the standard method", async () => {
    const { container } = renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod()] } }),
      baseConfig({ instantPayments: ["googlepay"] })
    );

    await waitFor(() => expect(container.querySelector(".instant-payments")).toBeTruthy());
    // Card remains as a standard (here sole) option...
    expect(screen.getByText("Card number")).toBeTruthy();
    // ...and Google Pay is NOT shown as a standard chooser row.
    expect(screen.queryByText("Google Pay")).toBeNull();
  });
});
