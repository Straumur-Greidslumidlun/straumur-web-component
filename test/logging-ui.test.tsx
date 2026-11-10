import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/preact";

const A = vi.hoisted(() => {
  const cap: any = { checkout: [], card: [], instances: [] };
  class FakeCustomCard {
    mount = vi.fn();
    remove = vi.fn();
    unmount = vi.fn();
    submit = vi.fn();
    isValid = true;
    dualBrandingChangeHandler = vi.fn();
    constructor(_core: unknown, opts: any) {
      cap.card.push(opts);
      cap.instances.push(this);
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
import PaymentMethodItem from "../src/components/payment-method-item/payment-method-item";
import { PaymentMethodGroupContext } from "../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../src/localizations/i18n-context";
import { I18nService } from "../src/localizations/i18n-service";
import { AdyenCheckout } from "@adyen/adyen-web";
import { Logger } from "../src/logging/component-logger";
import { LogFields } from "../src/logging/log-events";
import { createFieldErrorReporter } from "../src/logging/field-errors";
import { createApplePayMerchantValidation } from "../src/components/shared/apple-pay-merchant-validation";
import { baseConfig, makePaymentMethods, scheme } from "./helpers/fixtures";

type Recorded = { type: string; fields?: LogFields };

function recordingLogger(): Logger & { events: Recorded[]; of: (type: string) => Recorded[] } {
  const events: Recorded[] = [];
  return {
    events,
    of: (type) => events.filter((x) => x.type === type),
    log: (type, fields) => {
      events.push({ type, fields });
    },
    start: () => {},
    stop: () => {},
  };
}

function inGroup(children: h.JSX.Element, isSole = true) {
  return (
    <I18nProvider i18nService={new I18nService("en-US")}>
      <PaymentMethodGroupContext
        initialValue={isSole ? "card" : null}
        isSolePaymentMethod={isSole}
        hasCard={true}
        hasGooglePay={false}
        hasApplePay={false}
        hasKortalan={false}
        hasStoredPaymentMethods={false}
      >
        {children}
      </PaymentMethodGroupContext>
    </I18nProvider>
  );
}

async function renderCardForm(logger: Logger, enableStoreDetails?: "AskForConsent") {
  const paymentMethods = makePaymentMethods({
    paymentMethods: { paymentMethods: [scheme(["visa", "mc"])] },
    ...(enableStoreDetails ? { enableStoreDetails } : {}),
  });
  render(
    inGroup(
      <CardForm configuration={baseConfig({ logger })} paymentMethods={paymentMethods} onBrandHidden={() => {}} />
    )
  );
  await waitFor(() => expect(A.cap.card.length).toBeGreaterThan(0));
  return A.cap.card[0];
}

beforeEach(() => {
  A.cap.checkout.length = 0;
  A.cap.card.length = 0;
  A.cap.instances.length = 0;
  vi.mocked(AdyenCheckout).mockImplementation(async (config: any) => {
    A.cap.checkout.push(config);
    return {} as never;
  });
});

describe("card form UI events", () => {
  it("logs card validity only when it flips, not on every change", async () => {
    const logger = recordingLogger();
    const card = await renderCardForm(logger);

    act(() => {
      card.onChange({ isValid: false });
      card.onChange({ isValid: false });
      card.onChange({ isValid: true });
      card.onChange({ isValid: true });
      card.onChange({ isValid: false });
    });

    expect(logger.of("validation.cardValidityChanged").map((x) => x.fields)).toEqual([
      { paymentMethod: "card", isValid: true },
      { paymentMethod: "card", isValid: false },
    ]);
  });

  it("logs a field error code once per change, never the localized text", async () => {
    const logger = recordingLogger();
    const card = await renderCardForm(logger);
    const numberError = {
      fieldType: "encryptedCardNumber",
      error: "error.va.sf-cc-num.04",
      errorI18n: "Enter a valid card number",
    };

    act(() => card.onValidationError([numberError]));
    act(() => card.onValidationError([numberError]));
    act(() => card.onValidationError([{ ...numberError, error: "error.va.sf-cc-num.01" }]));
    act(() => card.onValidationError([]));
    act(() => card.onValidationError([numberError]));

    expect(logger.of("validation.fieldError").map((x) => x.fields)).toEqual([
      { paymentMethod: "card", field: "encryptedCardNumber", errorCode: "error.va.sf-cc-num.04" },
      { paymentMethod: "card", field: "encryptedCardNumber", errorCode: "error.va.sf-cc-num.01" },
      { paymentMethod: "card", field: "encryptedCardNumber", errorCode: "error.va.sf-cc-num.04" },
    ]);
    expect(JSON.stringify(logger.events)).not.toContain("Enter a valid card number");
  });

  it("logs the pay button and Enter separately, before the gate", async () => {
    const logger = recordingLogger();
    const card = await renderCardForm(logger);
    act(() => card.onChange({ isValid: true }));

    fireEvent.click(document.querySelector(".straumur__card-component__submit-button")!);
    await waitFor(() => expect(logger.of("payment.beforeSubmit")).toHaveLength(1));
    act(() => card.onEnterKeyPressed());

    const types = logger.events.map((x) => x.type);
    expect(types.indexOf("ui.payClicked")).toBeLessThan(types.indexOf("payment.beforeSubmit"));
    expect(logger.of("ui.payClicked")[0].fields).toEqual({ paymentMethod: "card" });
    expect(logger.of("ui.enterPressed")[0].fields).toEqual({ paymentMethod: "card" });
  });

  it("logs the dual-brand choice and the store-details checkbox", async () => {
    const logger = recordingLogger();
    const card = await renderCardForm(logger, "AskForConsent");

    act(() =>
      card.onBinLookup({
        supportedBrandsRaw: [
          { brand: "cartebancaire", localeBrand: "CB", brandImageUrl: "" },
          { brand: "visa", localeBrand: "Visa", brandImageUrl: "" },
        ],
      })
    );
    const brandOption = await waitFor(() => {
      const element = document.querySelector('[data-value="cartebancaire"]');
      expect(element).not.toBeNull();
      return element!;
    });
    fireEvent.click(brandOption);
    fireEvent.click(screen.getByRole("checkbox"));

    expect(logger.of("ui.dualBrandSelected")[0].fields).toEqual({ brand: "cartebancaire" });
    expect(logger.of("ui.storeDetailsToggled")[0].fields).toEqual({ checked: true });
  });

  it("logs an Adyen initialization failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(AdyenCheckout).mockRejectedValue(new Error("bad client key"));
    const logger = recordingLogger();

    render(
      inGroup(
        <CardForm
          configuration={baseConfig({ logger })}
          paymentMethods={makePaymentMethods({ paymentMethods: { paymentMethods: [scheme(["visa"])] } })}
          onBrandHidden={() => {}}
        />
      )
    );

    await waitFor(() =>
      expect(logger.of("error.init")).toEqual([{ type: "error.init", fields: { paymentMethod: "card" } }])
    );
  });
});

describe("method selection", () => {
  it("logs ui.methodSelected with the method when the shopper picks it", () => {
    const logger = recordingLogger();
    const onChange = vi.fn();

    render(
      inGroup(
        <PaymentMethodItem
          icon={<span />}
          title="Card"
          isActive={false}
          isSole={false}
          onChange={onChange}
          logger={logger}
          paymentMethod="card"
        >
          <span />
        </PaymentMethodItem>,
        false
      )
    );
    fireEvent.click(screen.getByRole("radio"));

    expect(onChange).toHaveBeenCalled();
    expect(logger.of("ui.methodSelected")[0].fields).toEqual({ paymentMethod: "card" });
  });
});

describe("createFieldErrorReporter", () => {
  it("ignores items without a field or code and survives a throwing logger", () => {
    const logger = recordingLogger();
    const report = createFieldErrorReporter(logger, "storedcard");

    report([{ fieldType: "encryptedSecurityCode" }, { error: "x" }]);
    expect(logger.events).toEqual([]);

    const throwing = createFieldErrorReporter(
      {
        ...logger,
        log: () => {
          throw new Error("boom");
        },
      },
      "card"
    );
    expect(() => throwing([{ fieldType: "encryptedCardNumber", error: "e" }])).not.toThrow();
  });
});

describe("Apple Pay merchant validation", () => {
  it("logs the outcome only, never the validationURL or the session", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = recordingLogger();
    const resolve = vi.fn();
    const reject = vi.fn();

    createApplePayMerchantValidation(async () => ({ merchantSessionIdentifier: "secret-session" }), logger)(
      resolve,
      reject,
      "https://apple-pay-gateway.apple.com/secret-url"
    );
    createApplePayMerchantValidation(async () => Promise.reject(new Error("no cert")), logger)(
      resolve,
      reject,
      "https://apple-pay-gateway.apple.com/secret-url"
    );
    await waitFor(() => expect(logger.events).toHaveLength(2));

    expect(logger.events.map((x) => x.fields)).toEqual(expect.arrayContaining([{ success: true }, { success: false }]));
    expect(JSON.stringify(logger.events)).not.toContain("secret");
  });
});
