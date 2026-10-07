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

// Kortalán as the sole payment method renders as a single branded button instead of a one-option
// radio chooser. It is deliberately NOT expressible in instantPayments — it cannot render there.
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

  it("keeps its height tied to the collapsed row's box model", () => {
    // A Kortalán-only widget must be the same size as the same widget with other methods present, so
    // the button's height is the row's own box model: 2x the row's vertical padding token + the 26px
    // brand lockup. jsdom never applies the bundled CSS, so assert the declarations themselves -
    // this fails if the row's padding token changes without the button following.
    const rowCss = readFileSync(
      join(process.cwd(), "src/components/payment-method-item/payment-method-item.css"),
      "utf8"
    );
    const buttonCss = readFileSync(join(process.cwd(), "src/features/kortalan/kortalan-standalone-button.css"), "utf8");

    expect(rowCss).toContain("padding: var(--straumur__space-xxlg) var(--straumur__space-5xlg);");
    expect(buttonCss).toContain("height: calc(var(--straumur__space-xxlg) * 2 + 26px);");
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
      fireEvent.click(await screen.findByText("Kortalán"));

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

  it("is never rendered in the instant strip, even if a JS caller forces the token", () => {
    // The public type excludes "kortalan", but an untyped caller can still pass it - the strip must
    // drop it rather than try to render a button it has no slot for.
    const { container } = renderInGroup(
      <InstantPaymentsComponent
        configuration={baseConfig({ instantPayments: ["kortalan" as never, "googlepay"] })}
        paymentMethods={walletMethods}
      />,
      { hasKortalan: true, hasGooglePay: true, hasApplePay: true }
    );

    expect(container.querySelector(".straumur__kortalan-standalone-button")).toBeNull();
    // The valid wallet token beside it still renders, so the drop is targeted, not a bail-out.
    expect(container.querySelectorAll(".straumur__instant-payments > div").length).toBe(1);
  });
});
