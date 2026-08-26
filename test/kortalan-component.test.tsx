import { Fragment, h } from "preact";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/preact";
import KortalanComponent from "../src/features/kortalan/kortalan-component";
import { usePaymentMethodGroup } from "../src/components/payment-method-group/payment-method-group-context";
import { baseConfig, makePaymentMethods, renderInGroup } from "./helpers/fixtures";
import { PaymentFlow, PaymentFlowResult } from "../src/models/models";

// Reflects the shared cross-method lock so a test can observe it from outside KortalanComponent.
function PaymentInProgressProbe() {
  const { paymentInProgress } = usePaymentMethodGroup();
  return <span data-testid="pip">{String(paymentInProgress)}</span>;
}

function makeFlow(overrides: Partial<PaymentFlow> = {}): PaymentFlow {
  return {
    submitPayment: vi.fn(async () => ({
      resultCode: "RedirectShopper" as const,
      action: { type: "redirect", url: "https://kortalan.example/pay" },
    })),
    submitAdditionalDetails: vi.fn(),
    ...overrides,
  };
}

describe("KortalanComponent", () => {
  let assignSpy: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    assignSpy = vi.fn();
    // jsdom's location.assign is non-configurable, so replace window.location with a minimal stand-in
    // that carries the spy (the component only calls location.assign).
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: originalLocation.href, origin: originalLocation.origin, assign: assignSpy },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it("renders nothing when Kortalán is unavailable", () => {
    const { container } = renderInGroup(
      <KortalanComponent configuration={baseConfig()} paymentMethods={makePaymentMethods()} />,
      { hasKortalan: false }
    );

    expect(container.querySelector(".straumur__kortalan-component__submit-button")).toBeNull();
  });

  it("renders the Straumur x Kortalán lockup and the money-bill glyph in the row header", () => {
    const { container } = renderInGroup(
      <KortalanComponent configuration={baseConfig()} paymentMethods={makePaymentMethods()} />,
      { hasKortalan: true }
    );

    // The brand lockup sits on the right of the header, alongside the method glyph on the left.
    const logo = container.querySelector(".straumur__kortalan-component__logo svg");
    expect(logo).not.toBeNull();
    expect(logo!.getAttribute("viewBox")).toBe("0 0 123.555 31.9999");

    // Two svgs in the row: the icon slot glyph and the lockup.
    expect(container.querySelectorAll(".straumur__payment-method-item svg").length).toBeGreaterThanOrEqual(2);
  });

  it("does not render the lockup when the row itself is hidden", () => {
    const { container } = renderInGroup(
      <KortalanComponent configuration={baseConfig()} paymentMethods={makePaymentMethods()} />,
      { hasKortalan: false }
    );

    expect(container.querySelector(".straumur__kortalan-component__logo")).toBeNull();
  });

  it("renders nothing as a standalone row when Kortalán is configured as an instant payment", () => {
    // In instantPayments it renders only in the express strip; the standalone row stays hidden.
    const { container } = renderInGroup(
      <KortalanComponent
        configuration={baseConfig({ instantPayments: ["kortalan"] })}
        paymentMethods={makePaymentMethods()}
      />,
      { hasKortalan: true }
    );

    expect(container.querySelector(".straumur__kortalan-component__submit-button")).toBeNull();
  });

  it("submits the kortalan method and redirects on a Pending redirect action", async () => {
    const paymentFlow = makeFlow();
    renderInGroup(
      <KortalanComponent configuration={baseConfig({ paymentFlow })} paymentMethods={makePaymentMethods()} />,
      { hasKortalan: true, isSolePaymentMethod: true, initialValue: "kortalan" }
    );

    fireEvent.click(await screen.findByText("Continue to Kortalán"));

    await waitFor(() =>
      expect(paymentFlow.submitPayment).toHaveBeenCalledWith({
        clientStateDataIndicator: false,
        paymentMethod: { type: "kortalan" },
      })
    );
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://kortalan.example/pay"));
  });

  it("notifies the host and never redirects when the payment is refused before any redirect", async () => {
    const paymentFlow = makeFlow({
      submitPayment: vi.fn(async () => ({ resultCode: "Refused" as const, action: undefined })),
    });
    const onPaymentFailed = vi.fn();
    renderInGroup(
      <KortalanComponent
        configuration={baseConfig({ paymentFlow, onPaymentFailed })}
        paymentMethods={makePaymentMethods()}
      />,
      { hasKortalan: true, isSolePaymentMethod: true, initialValue: "kortalan" }
    );

    fireEvent.click(await screen.findByText("Continue to Kortalán"));

    await waitFor(() => expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Refused" }));
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("notifies the host and unlocks the widget when the payment call throws", async () => {
    const paymentFlow = makeFlow({
      submitPayment: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const onPaymentFailed = vi.fn();
    renderInGroup(
      <Fragment>
        <KortalanComponent
          configuration={baseConfig({ paymentFlow, onPaymentFailed })}
          paymentMethods={makePaymentMethods()}
        />
        <PaymentInProgressProbe />
      </Fragment>,
      { hasKortalan: true, isSolePaymentMethod: true, initialValue: "kortalan" }
    );

    fireEvent.click(await screen.findByText("Continue to Kortalán"));

    // No Adyen element owns this outcome, so the hook itself must report the failure to the host.
    await waitFor(() => expect(onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Error" }));
    expect(assignSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("pip").textContent).toBe("false"));
  });

  it("locks the widget (paymentInProgress) while the payment call is in flight", async () => {
    let resolvePay!: (value: PaymentFlowResult) => void;
    const paymentFlow = makeFlow({
      submitPayment: vi.fn(() => new Promise<PaymentFlowResult>((resolve) => (resolvePay = resolve))),
    });

    renderInGroup(
      <Fragment>
        <KortalanComponent configuration={baseConfig({ paymentFlow })} paymentMethods={makePaymentMethods()} />
        <PaymentInProgressProbe />
      </Fragment>,
      { hasKortalan: true, isSolePaymentMethod: true, initialValue: "kortalan" }
    );

    expect(screen.getByTestId("pip").textContent).toBe("false");

    fireEvent.click(await screen.findByText("Continue to Kortalán"));

    // Call in flight (submitPayment pending) -> the rest of the widget is locked.
    await waitFor(() => expect(screen.getByTestId("pip").textContent).toBe("true"));

    // Completing with a redirect keeps it locked (the page is navigating away).
    resolvePay({ resultCode: "RedirectShopper", action: { type: "redirect", url: "https://kortalan.example/pay" } });
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://kortalan.example/pay"));
    expect(screen.getByTestId("pip").textContent).toBe("true");
  });
});
