import { h } from "preact";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/preact";
import KortalanComponent from "../src/features/kortalan/kortalan-component";
import { baseConfig, makePaymentMethods, renderInGroup } from "./helpers/fixtures";
import { PaymentFlow } from "../src/models/models";

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
});
