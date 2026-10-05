import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/preact";

/**
 * CardForm's field-level Adyen callbacks (dual-brand detection, validation, CVC policy, validity) and
 * the store-consent checkbox. The Adyen CustomCard options are captured and invoked directly.
 */
const A = vi.hoisted(() => {
  const cap: any = { card: [], checkout: [] };
  class FakeCustomCard {
    mount = vi.fn();
    remove = vi.fn();
    submit = vi.fn();
    dualBrandingChangeHandler = vi.fn();
    constructor(_core: unknown, opts: any) {
      cap.card.push(opts);
      opts.onConfigSuccess?.();
    }
  }
  return { cap, FakeCustomCard };
});

vi.mock("@adyen/adyen-web", () => ({
  AdyenCheckout: vi.fn(async (config: any) => {
    A.cap.checkout.push(config);
    return {};
  }),
  CustomCard: A.FakeCustomCard,
  GooglePay: class {},
  ApplePay: class {},
}));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import CardForm from "../src/components/card-form/card-form";
import { PaymentMethodGroupContext } from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { createPaymentRequest } from "../src/adapter/straumur-adapter";
import { baseConfig, makePaymentMethods, scheme } from "./helpers/fixtures";
import { SuccessResponse } from "../src/services/models";

const createPayment = vi.mocked(createPaymentRequest);

async function setup({
  config = baseConfig(),
  paymentMethods = makePaymentMethods({
    paymentMethods: { paymentMethods: [scheme(["visa", "mc", "cartebancaire"])] },
  }),
}: { config?: ReturnType<typeof baseConfig>; paymentMethods?: SuccessResponse } = {}) {
  render(
    <I18nProvider i18nService={new I18nService("en-US")}>
      <PaymentMethodGroupContext
        initialValue="card"
        isSolePaymentMethod={true}
        hasCard={true}
        hasGooglePay={false}
        hasApplePay={false}
        hasKortalan={false}
        hasStoredPaymentMethods={false}
      >
        <CardForm configuration={config} paymentMethods={paymentMethods} onBrandHidden={() => {}} />
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
  await waitFor(() => expect(A.cap.card.length).toBeGreaterThan(0));
  // The card's onSubmit is a core-level (AdyenCheckout) callback; the field callbacks are on CustomCard.
  return { ...A.cap.card[0], onSubmit: A.cap.checkout[0].onSubmit };
}

beforeEach(() => {
  A.cap.card.length = 0;
  A.cap.checkout.length = 0;
  createPayment.mockReset();
});

describe("CardForm dual-brand detection (onBinLookup)", () => {
  it("shows the brand picker for a co-branded card, with both brands named", async () => {
    const card = await setup();

    await act(async () => {
      card.onBinLookup({
        supportedBrandsRaw: [
          { brand: "visa", localeBrand: "Visa", brandImageUrl: "v.svg" },
          { brand: "cartebancaire", localeBrand: "Carte Bancaire", brandImageUrl: "cb.svg" },
        ],
      });
    });

    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Visa" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Carte Bancaire" })).toBeTruthy();
  });

  it("does not show the picker for a single-brand card", async () => {
    const card = await setup();

    await act(async () => {
      card.onBinLookup({ supportedBrandsRaw: [{ brand: "visa", localeBrand: "Visa", brandImageUrl: "v.svg" }] });
    });

    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});

describe("CardForm field validation", () => {
  it("shows Adyen's field error message and clears it once the field is valid", async () => {
    const card = await setup();

    await act(async () => {
      card.onValidationError([{ fieldType: "encryptedCardNumber", error: "error-1", errorI18n: "Invalid number" }]);
    });
    expect(screen.getByText("Invalid number")).toBeTruthy();

    await act(async () => {
      card.onValidationError([{ fieldType: "encryptedCardNumber", error: "", errorI18n: "" }]);
    });
    expect(screen.queryByText("Invalid number")).toBeNull();
  });

  it("enables the pay button and notifies the host once all fields are valid", async () => {
    const onCardValidityChanged = vi.fn();
    const card = await setup({ config: baseConfig({ onCardValidityChanged }) });
    const payButton = screen.getByRole("button", { name: "ISK 10" }) as HTMLButtonElement;
    expect(payButton.disabled).toBe(true);
    // Activation signals "active, not yet valid" first; validity arrives as the shopper types.
    await waitFor(() => expect(onCardValidityChanged).toHaveBeenCalledWith(false, true));

    await act(async () => card.onAllValid({ allValid: true }));

    expect(payButton.disabled).toBe(false);
    expect(onCardValidityChanged).toHaveBeenLastCalledWith(true, true);
  });

  it.each([
    ["optional", "Security code (optional)"],
    ["required", "Security code"],
  ])("labels the CVC per the brand's cvcPolicy (%s)", async (cvcPolicy, label) => {
    const card = await setup();

    await act(async () => card.onBrand({ brand: "visa", cvcPolicy }));

    expect(screen.getByText(label, { selector: "label" })).toBeTruthy();
  });

  it("hides the CVC field for a brand whose cvcPolicy is hidden", async () => {
    const card = await setup();

    await act(async () => card.onBrand({ brand: "visa", cvcPolicy: "hidden" }));

    expect(screen.queryByText("Security code", { selector: "label" })).toBeNull();
  });
});

describe("CardForm store-consent checkbox", () => {
  const askForConsent = makePaymentMethods({
    enableStoreDetails: "AskForConsent",
    paymentMethods: { paymentMethods: [scheme()] },
  });

  it("is only offered when the session asks for consent", async () => {
    await setup();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("sends storePaymentMethod: true once the shopper ticks it", async () => {
    createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "Authorised" }) } as any);
    const card = await setup({ paymentMethods: askForConsent });

    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => {
      await card.onSubmit({ data: { paymentMethod: { type: "scheme" } } }, {}, { resolve: vi.fn(), reject: vi.fn() });
    });

    expect(createPayment).toHaveBeenCalledWith("test", expect.objectContaining({ storePaymentMethod: true }));
  });

  it("sends storePaymentMethod: false when left unticked", async () => {
    createPayment.mockResolvedValue({ ok: true, json: async () => ({ resultCode: "Authorised" }) } as any);
    const card = await setup({ paymentMethods: askForConsent });

    await act(async () => {
      await card.onSubmit({ data: { paymentMethod: { type: "scheme" } } }, {}, { resolve: vi.fn(), reject: vi.fn() });
    });

    expect(createPayment).toHaveBeenCalledWith("test", expect.objectContaining({ storePaymentMethod: false }));
  });
});
