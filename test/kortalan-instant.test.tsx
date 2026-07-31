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
import { renderInGroup, baseConfig, makePaymentMethods, googlePayMethod, applePayMethod } from "./helpers/fixtures";
import { PaymentFlow } from "../src/models/models";

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

describe("InstantPaymentsComponent — Kortalán", () => {
  it("renders nothing when Kortalán is configured but unavailable", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan"] })}
        paymentMethods={makePaymentMethods()}
      />,
      { hasKortalan: false }
    );

    expect(container.querySelector(".instant-payments")).toBeNull();
  });

  it("renders Kortalán as a full-width express button when it is the only instant method", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan"] })}
        paymentMethods={makePaymentMethods()}
      />,
      { hasKortalan: true }
    );

    const wrapper = container.querySelector(".instant-payments")!;
    expect(wrapper).toBeTruthy();
    // Only method -> single column; the lone cell fills the width (no explicit full-span needed).
    expect(wrapper.className).toContain("instant-payments--single");
    expect(wrapper.querySelector(".instant-payments__full")).toBeNull();
    expect(wrapper.querySelector(".straumur__kortalan-instant-button")).toBeTruthy();
    expect(screen.getByText("Continue to Kortalán")).toBeTruthy();
  });

  it("submits the kortalan method and redirects when the express button is clicked", async () => {
    const assignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: originalLocation.href, origin: originalLocation.origin, assign: assignSpy },
    });

    try {
      const paymentFlow = makeRedirectFlow();
      renderInGroup(
        <InstantPaymentsComponent
          configuration={baseConfig({ instantPayments: ["kortalan"], paymentFlow })}
          paymentMethods={makePaymentMethods()}
        />,
        { hasKortalan: true }
      );

      fireEvent.click(await screen.findByText("Continue to Kortalán"));

      await waitFor(() =>
        expect(paymentFlow.submitPayment).toHaveBeenCalledWith({
          clientStateDataIndicator: false,
          paymentMethod: { type: "kortalan" },
        })
      );
      await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://kortalan.example/pay"));
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    }
  });

  it("lays out three express buttons two-up in configured order, the last spanning full width", () => {
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan", "googlepay", "applepay"] })}
        paymentMethods={walletMethods}
      />,
      { hasKortalan: true, hasGooglePay: true, hasApplePay: true }
    );

    const wrapper = container.querySelector(".instant-payments")!;
    expect(wrapper.className).toContain("instant-payments--multiple");

    const cells = wrapper.querySelectorAll(":scope > div");
    expect(cells.length).toBe(3);
    // Configured order is preserved: Kortalán (first) sits top-left and is NOT full-width.
    expect(cells[0].className).not.toContain("instant-payments__full");
    expect(cells[0].querySelector(".straumur__kortalan-instant-button")).toBeTruthy();
    // The odd trailing button (the 3rd) spans the full width below the first two.
    expect(cells[2].className).toContain("instant-payments__full");
  });

  it("themes the express button: whitish (light) by default, blackish (dark), and kortalanButtonTheme wins", () => {
    const render = (configuration: ReturnType<typeof baseConfig>) =>
      renderInGroup(<InstantPaymentsComponent configuration={configuration} paymentMethods={makePaymentMethods()} />, {
        hasKortalan: true,
      }).container.querySelector(".straumur__kortalan-instant-button")!;

    // Default follows the widget theme.
    expect(
      render(baseConfig({ instantPayments: ["kortalan"], theme: "light" })).getAttribute("data-kortalan-theme")
    ).toBe("light");
    expect(
      render(baseConfig({ instantPayments: ["kortalan"], theme: "dark" })).getAttribute("data-kortalan-theme")
    ).toBe("dark");
    // Override wins over the widget theme.
    expect(
      render(baseConfig({ instantPayments: ["kortalan"], theme: "light", kortalanButtonTheme: "dark" })).getAttribute(
        "data-kortalan-theme"
      )
    ).toBe("dark");
  });

  it("places Kortalán side-by-side with a single wallet (not stacked)", () => {
    const gpayOnly = makePaymentMethods({ paymentMethods: { paymentMethods: [googlePayMethod()] } });
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan", "googlepay"] })}
        paymentMethods={gpayOnly}
      />,
      { hasKortalan: true, hasGooglePay: true }
    );

    const wrapper = container.querySelector(".instant-payments")!;
    // Kortalán + one wallet -> two columns, side by side; Kortalán is a peer, not full-width here.
    expect(wrapper.className).toContain("instant-payments--multiple");
    expect(wrapper.querySelector(".instant-payments__full")).toBeNull();
    expect(wrapper.querySelector(".straumur__kortalan-instant-button")).toBeTruthy();
  });
});
