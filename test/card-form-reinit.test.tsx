import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/preact";

/**
 * Regression test for Adyen re-initialization leaking the previous instance.
 *
 * When `configuration` changes (e.g. a locale switch), CardForm re-runs
 * `initializeAdyenComponent`, which creates a fresh AdyenCheckout + CustomCard and mounts
 * it onto the same DOM ref. The previously mounted CustomCard is never unmounted, leaking
 * the old secure iframes. This test asserts the previous instance is torn down on re-init.
 */

// Hoisted so the vi.mock factory (which is itself hoisted) can reference it.
const { FakeCustomCard } = vi.hoisted(() => {
  class FakeCustomCard {
    static instances: FakeCustomCard[] = [];
    mount = vi.fn();
    unmount = vi.fn();
    remove = vi.fn();
    constructor(_core: unknown, opts: any) {
      FakeCustomCard.instances.push(this);
      // Adyen fires this once the component is configured; the form uses it to flip
      // its "initialized" flag so a subsequent config change takes the re-init path.
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
import { PaymentMethodGroupContext } from "../src/components/payment-method-group/payment-method-group-context";
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

function tree(configuration: any) {
  return (
    <I18nProvider i18nService={i18n}>
      <PaymentMethodGroupContext
        initialValue="card"
        isSolePaymentMethod={true}
        hasCard={true}
        hasGooglePay={false}
        hasApplePay={false}
        hasKortalan={false}
        hasStoredPaymentMethods={false}
      >
        <CardForm configuration={configuration} paymentMethods={paymentMethods} onBrandHidden={() => {}} />
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
}

describe("CardForm Adyen re-initialization", () => {
  beforeEach(() => {
    FakeCustomCard.instances.length = 0;
  });

  it("tears down the previous Adyen instance (remove) when configuration changes", async () => {
    const configEn = { sessionId: "s1", environment: "test", locale: "en-US" };
    const configIs = { sessionId: "s1", environment: "test", locale: "is-IS" };

    const { rerender } = render(tree(configEn));

    // First initialization.
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(1));
    const first = FakeCustomCard.instances[0];

    // Change the configuration identity -> triggers re-init.
    rerender(tree(configIs));

    // A second instance is created...
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(2));

    // ...and the first one must be fully torn down with remove() — consistent with the wallet
    // components (google-pay-button / apple-pay-button both call .remove() on re-init).
    expect(first.remove).toHaveBeenCalled();
  });
});
