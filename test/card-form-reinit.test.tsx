import { h } from "preact";
import { useEffect } from "preact/hooks";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/preact";

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
import {
  PaymentMethodGroupContext,
  usePaymentMethodGroup,
} from "../src/components/payment-method-group/payment-method-group-context";
import { AdyenCheckout } from "@adyen/adyen-web";
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

/** Exposes the group context to the test (to flip paymentInProgress, read error). */
const ctx: { current: ReturnType<typeof usePaymentMethodGroup> | null } = { current: null };
function Probe() {
  const group = usePaymentMethodGroup();
  useEffect(() => {
    ctx.current = group;
  });
  return null;
}

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
        <Probe />
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

describe("CardForm Adyen re-initialization guards", () => {
  const configEn = { sessionId: "s1", environment: "test", locale: "en-US" } as any;
  const configIs = { sessionId: "s1", environment: "test", locale: "is-IS" } as any;

  beforeEach(() => {
    FakeCustomCard.instances.length = 0;
    vi.mocked(AdyenCheckout).mockImplementation(async () => ({}) as any);
  });

  it("does not rebuild on a re-render with the same configuration object", async () => {
    const { rerender } = render(tree(configEn));
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(1));

    rerender(tree(configEn));
    await act(async () => {});

    expect(FakeCustomCard.instances).toHaveLength(1);
  });

  it("defers a config change while a payment is in flight, then applies it once", async () => {
    const { rerender } = render(tree(configEn));
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(1));

    await act(async () => ctx.current!.setPaymentInProgress(true));
    rerender(tree(configIs));
    await act(async () => {});
    // Rebuilding now would destroy an in-flight payment / 3DS challenge.
    expect(FakeCustomCard.instances).toHaveLength(1);

    await act(async () => ctx.current!.setPaymentInProgress(false));
    await waitFor(() => expect(FakeCustomCard.instances).toHaveLength(2));
    expect(FakeCustomCard.instances[0].remove).toHaveBeenCalled();
  });

  it("never mounts two CustomCards when inits overlap", async () => {
    const pending: Array<(core: unknown) => void> = [];
    vi.mocked(AdyenCheckout).mockImplementation(() => new Promise((resolve) => pending.push(resolve)) as any);

    const { rerender } = render(tree(configEn));
    await waitFor(() => expect(pending).toHaveLength(1));
    // Config changes while the first AdyenCheckout is still loading -> a second init starts.
    rerender(tree(configIs));
    await waitFor(() => expect(pending).toHaveLength(2));

    // Resolve the newer one first, then the stale one.
    await act(async () => pending[1]({}));
    await act(async () => pending[0]({}));

    expect(FakeCustomCard.instances).toHaveLength(1);
  });

  it("shows an error instead of an endless loader when Adyen fails to initialize", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(AdyenCheckout).mockRejectedValue(new Error("bad clientKey"));

    render(tree(configEn));

    await waitFor(() => expect(ctx.current!.error).toEqual({ key: "error.failedToInitializePaymentMethods" }));
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
