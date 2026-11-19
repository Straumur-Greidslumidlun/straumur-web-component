import { readFileSync } from "node:fs";
import { join } from "node:path";
import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/preact";

// The instant strip imports GooglePayButton/ApplePayButton, which pull in @adyen/adyen-web. Mock the
// wallet classes so the two wallets mount (isAvailable resolves) and stay in the strip.
const A = vi.hoisted(() => {
  class FakeWallet {
    mount = vi.fn();
    remove = vi.fn();
    constructor(_c: unknown, _o: any) {}
    isAvailable() {
      return Promise.resolve();
    }
  }
  return { FakeWallet };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({})),
  CustomCard: class {},
  GooglePay: A.FakeWallet,
  ApplePay: A.FakeWallet,
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import InstantPaymentsComponent from "../src/features/instantPayments/instant-payments-component";
import KortalanComponent from "../src/features/kortalan/kortalan-component";
import { renderInGroup, baseConfig, makePaymentMethods, googlePayMethod, applePayMethod } from "./helpers/fixtures";
import { PaymentFlow } from "../src/models/models";
import { I18nService } from "../src/localizations/i18n-service";

function makeRedirectFlow(overrides: Partial<PaymentFlow> = {}): PaymentFlow {
  return {
    submitPayment: vi.fn(async () => ({
      resultCode: "RedirectShopper" as const,
      action: { type: "redirect", url: "https://kortalan.example/pay" },
    })),
    submitAdditionalDetails: vi.fn(),
    ...overrides,
  };
}

const walletMethods = makePaymentMethods({
  paymentMethods: { paymentMethods: [googlePayMethod(), applePayMethod()] },
});

// Kortalán as the sole payment method renders as its one-click card (heading + branded button) instead
// of a one-option radio chooser. In instantPayments it renders the same card, never in the wallet row.
describe("Kortalán standalone button", () => {
  const renderSole = (configuration = baseConfig()) =>
    renderInGroup(<KortalanComponent configuration={configuration} paymentMethods={makePaymentMethods()} />, {
      hasKortalan: true,
      isSolePaymentMethod: true,
      initialValue: "kortalan",
    });

  it("renders the brand button with the Straumur symbol and the localized label", () => {
    const { container } = renderSole();
    const button = container.querySelector(".straumur__kortalan-standalone-button")!;

    expect(button).toBeTruthy();
    expect(button.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 32 8");
    expect(button.textContent).toContain("Kortalán");
  });

  it("renders inside the card under the localized heading", () => {
    const { container } = renderSole();
    const card = container.querySelector(".straumur__kortalan-instant-card")!;

    expect(card).toBeTruthy();
    expect(card.querySelector(".straumur__kortalan-instant-card__title")?.textContent).toBe(
      "Split your payment with Straumur Kortalán"
    );
    expect(card.querySelector(".straumur__kortalan-standalone-button")?.textContent).toBe("Straumur Kortalán");
  });

  it("uses the design's 76px button height", () => {
    // jsdom never applies the bundled CSS, so assert the declaration itself (Figma node 2635:3047).
    const buttonCss = readFileSync(join(process.cwd(), "src/features/kortalan/kortalan-standalone-button.css"), "utf8");

    expect(buttonCss).toContain("height: 76px;");
  });

  it("renders one fixed brand appearance - no theme variants, in either widget theme", () => {
    // Kortalán's colors are the provider's, so the button carries no theme hook at all (mirrors the
    // Google Pay / Apple Pay buttons).
    for (const theme of ["light", "dark"] as const) {
      const { container } = renderSole(baseConfig({ theme }));
      const button = container.querySelector(".straumur__kortalan-standalone-button")!;

      expect(button.getAttribute("data-kortalan-theme")).toBeNull();
      expect(button.className).toBe("straumur__kortalan-standalone-button");
    }
  });

  it("submits the kortalan method and redirects when the button is clicked", async () => {
    const paymentFlow = makeRedirectFlow();
    const assign = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: originalLocation.href, origin: originalLocation.origin, assign },
    });

    try {
      renderSole(baseConfig({ paymentFlow }));
      fireEvent.click(await screen.findByText("Straumur Kortalán"));

      await waitFor(() =>
        expect(paymentFlow.submitPayment).toHaveBeenCalledWith(
          expect.objectContaining({ paymentMethod: { type: "kortalan" } })
        )
      );
      await waitFor(() => expect(assign).toHaveBeenCalledWith("https://kortalan.example/pay"));
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    }
  });

  it("is never rendered in the wallet row, even when listed in instantPayments", () => {
    // "kortalan" is a valid instantPayments token, but it renders as its own card in the "kortalan"
    // slot; the wallet row must skip it.
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan", "googlepay"] })}
        paymentMethods={walletMethods}
      />,
      { hasKortalan: true, hasGooglePay: true, hasApplePay: true }
    );

    expect(container.querySelector(".straumur__kortalan-standalone-button")).toBeNull();
    // The valid wallet token beside it still renders, so the drop is targeted, not a bail-out.
    expect(container.querySelectorAll(".straumur__instant-payments > div").length).toBe(1);
  });

  it("renders the card, not the radio row, when listed in instantPayments beside other methods", () => {
    const { container } = renderInGroup(
      <KortalanComponent
        configuration={baseConfig({ instantPayments: ["kortalan"] })}
        paymentMethods={makePaymentMethods()}
      />,
      { hasKortalan: true, hasCard: true, isSolePaymentMethod: false }
    );

    expect(container.querySelector(".straumur__kortalan-instant-card")).toBeTruthy();
    expect(container.querySelector(".straumur__payment-method-item")).toBeNull();
  });

  it("shows the Icelandic heading", () => {
    const { container } = renderInGroup(
      <KortalanComponent configuration={baseConfig()} paymentMethods={makePaymentMethods()} />,
      { hasKortalan: true, isSolePaymentMethod: true, initialValue: "kortalan" },
      new I18nService("is-IS")
    );

    expect(container.querySelector(".straumur__kortalan-instant-card__title")?.textContent).toBe(
      "Dreifðu greiðslu með Straumur Kortalán"
    );
  });
});
