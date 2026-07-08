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

const allMethods = () =>
  makePaymentMethods({
    paymentMethods: {
      paymentMethods: [scheme(), googlePayMethod(), applePayMethod()],
      storedPaymentMethods: [storedCard()],
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("allowedPaymentMethods filtering", () => {
  it("renders every available method when allowedPaymentMethods is not set (backward compatible)", () => {
    renderCheckout(allMethods());
    expect(screen.getByText("Card payment")).toBeTruthy();
    expect(screen.getByText("Google Pay")).toBeTruthy();
    expect(screen.getByText("Apple Pay")).toBeTruthy();
    expect(screen.getByText("•••• 1234")).toBeTruthy();
  });

  it("renders only the card option when allowedPaymentMethods is ['card']", () => {
    renderCheckout(allMethods(), baseConfig({ allowedPaymentMethods: ["card"] }));
    expect(screen.getByText("Card payment")).toBeTruthy();
    expect(screen.queryByText("Google Pay")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
    expect(screen.queryByText("•••• 1234")).toBeNull();
  });

  it("renders only Google Pay when allowedPaymentMethods is ['googlepay']", () => {
    renderCheckout(allMethods(), baseConfig({ allowedPaymentMethods: ["googlepay"] }));
    expect(screen.getByText("Google Pay")).toBeTruthy();
    expect(screen.queryByText("Card payment")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
    expect(screen.queryByText("•••• 1234")).toBeNull();
  });

  it("renders only stored cards when allowedPaymentMethods is ['storedcard']", () => {
    renderCheckout(allMethods(), baseConfig({ allowedPaymentMethods: ["storedcard"] }));
    expect(screen.getByText("•••• 1234")).toBeTruthy();
    expect(screen.queryByText("Card payment")).toBeNull();
    expect(screen.queryByText("Google Pay")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
  });

  it("supports combinations, e.g. card + storedcard but no wallets", () => {
    renderCheckout(allMethods(), baseConfig({ allowedPaymentMethods: ["card", "storedcard"] }));
    expect(screen.getByText("Card payment")).toBeTruthy();
    expect(screen.getByText("•••• 1234")).toBeTruthy();
    expect(screen.queryByText("Google Pay")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
  });

  it("an empty allow-list hides every payment method", () => {
    renderCheckout(allMethods(), baseConfig({ allowedPaymentMethods: [] }));
    expect(screen.queryByText("Card payment")).toBeNull();
    expect(screen.queryByText("Google Pay")).toBeNull();
    expect(screen.queryByText("Apple Pay")).toBeNull();
    expect(screen.queryByText("•••• 1234")).toBeNull();
  });

  it("also excludes a disallowed wallet from the instant-payments strip", async () => {
    renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod()] } }),
      baseConfig({ allowedPaymentMethods: ["card"], instantPayments: ["googlepay"] })
    );

    await waitFor(() => expect(screen.getByText("Card payment")).toBeTruthy());
    expect(screen.queryByText("Google Pay")).toBeNull();
  });

  it("re-evaluates sole-method auto-selection against the filtered set", () => {
    // Card + Google Pay are both available, but only card is allowed -> card becomes the sole method.
    const { container } = renderCheckout(
      makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(), googlePayMethod()] } }),
      baseConfig({ allowedPaymentMethods: ["card"] })
    );
    expect(screen.getByText("Card number")).toBeTruthy();
    expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
  });
});
