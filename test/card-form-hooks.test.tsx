import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent, screen } from "@testing-library/preact";

/**
 * Regression test for the Rules-of-Hooks violation in CardForm.
 *
 * CardForm has early `return null` guards positioned *before* several `useEffect` calls.
 * When a guard flips at runtime (e.g. 3-D Secure activates for another method), the number
 * of hooks called changes between renders. This test drives that transition and asserts the
 * component stays consistent (no error, effects still behave) across it.
 */

const { FakeCustomCard } = vi.hoisted(() => {
  class FakeCustomCard {
    static instances: FakeCustomCard[] = [];
    mount = vi.fn();
    unmount = vi.fn();
    constructor(_core: unknown, opts: any) {
      FakeCustomCard.instances.push(this);
      opts.onConfigSuccess?.();
    }
  }
  return { FakeCustomCard };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async () => ({})),
  CustomCard: FakeCustomCard,
}));

import CardForm from "../src/components/card-form/card-form";
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";

const i18n = new I18nService("en-US");

const paymentMethods: any = {
  clientKey: "ck",
  currency: "ISK",
  minorUnitsAmount: 1000,
  formattedAmount: "ISK 10",
  enableStoreDetails: "Disabled",
  paymentMethods: { paymentMethods: [{ type: "scheme", name: "Cards", brands: ["visa", "mc"] }] },
};

const configuration: any = { sessionId: "s1", environment: "test", locale: "en-US" };

/** Lets the test flip context state that drives CardForm's render guards. */
function Controls() {
  const { setActivePaymentMethod, setThreeDSecureActive } = usePaymentMethodGroup();
  return (
    <button
      data-testid="activate-3ds-elsewhere"
      onClick={() => {
        // Another method takes over a 3DS challenge -> CardForm's guard should hide it.
        setActivePaymentMethod("googlepay");
        setThreeDSecureActive(true);
      }}
    >
      3ds
    </button>
  );
}

function tree() {
  return (
    <I18nProvider i18nService={i18n}>
      <PaymentMethodGroupContext
        initialValue="card"
        isSolePaymentMethod={false}
        hasCard={true}
        hasGooglePay={true}
        hasApplePay={false}
        hasKortalan={false}
        hasStoredPaymentMethods={false}
      >
        <Controls />
        <CardForm configuration={configuration} paymentMethods={paymentMethods} onBrandHidden={() => {}} />
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
}

describe("CardForm render-guard hook stability", () => {
  beforeEach(() => {
    FakeCustomCard.instances.length = 0;
  });

  it("does not error when a guard flips the component to null after hooks ran", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(tree());

    // Card active -> the form is shown and Adyen initialized once.
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(1));
    expect(screen.getByText("Card number")).toBeTruthy();

    // Flip the guard: 3DS active for another method -> CardForm returns null.
    fireEvent.click(screen.getByTestId("activate-3ds-elsewhere"));

    await waitFor(() => expect(screen.queryByText("Card number")).toBeNull());

    // No hook-order / render errors should have been logged during the transition.
    const hookErrors = errorSpy.mock.calls.filter((args) => String(args[0]).toLowerCase().includes("hook"));
    expect(hookErrors).toEqual([]);
  });
});
