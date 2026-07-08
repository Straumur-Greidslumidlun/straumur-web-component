import { h, ComponentChildren } from "preact";
import { render } from "@testing-library/preact";
import { PaymentMethodGroupContext } from "../../src/components/payment-method-group/payment-method-group-context";
import { I18nProvider } from "../../src/localizations/i18n-context";
import { I18nService } from "../../src/localizations/i18n-service";
import { SuccessResponse } from "../../src/services/models";
import { StraumurCheckoutConfiguration } from "../../src/models/models";

/**
 * A Success payment-methods response with sensible defaults; override any slice per test.
 * Typed to SuccessResponse so the fixture itself breaks if the response contract drifts.
 */
export function makePaymentMethods(overrides: Partial<SuccessResponse> = {}): SuccessResponse {
  const base: SuccessResponse = {
    resultCode: "Success",
    clientKey: "ck",
    currency: "ISK",
    minorUnitsAmount: 1000,
    formattedAmount: "ISK 10",
    merchantName: "Test Merchant",
    enableStoreDetails: "Disabled",
    locale: "en-US",
    amount: 10,
    paymentMethods: { paymentMethods: [], storedPaymentMethods: [] },
  };
  return { ...base, ...overrides };
}

export const scheme = (brands: string[] = ["visa", "mc"]) => ({ type: "scheme", name: "Cards", brands });
export const googlePayMethod = () => ({
  type: "googlepay",
  name: "Google Pay",
  configuration: { gatewayMerchantId: "gm", merchantId: "m" },
});
export const applePayMethod = () => ({
  type: "applepay",
  name: "Apple Pay",
  configuration: { gatewayMerchantId: "gm", merchantId: "m" },
});
export const storedCard = (overrides: Record<string, unknown> = {}) => ({
  type: "scheme",
  name: "VISA",
  brand: "visa",
  id: "stored-1",
  lastFour: "1234",
  expiryMonth: "03",
  expiryYear: "30",
  supportedRecurringProcessingModels: [],
  supportedShopperInteractions: [],
  ...overrides,
});

export function baseConfig(
  overrides: Partial<StraumurCheckoutConfiguration> = {}
): StraumurCheckoutConfiguration {
  return { sessionId: "s1", environment: "test", locale: "en-US", ...overrides };
}

export function makeGroupProps(overrides: Record<string, unknown> = {}) {
  return {
    initialValue: null,
    isSolePaymentMethod: false,
    hasCard: false,
    hasGooglePay: false,
    hasApplePay: false,
    hasStoredPaymentMethods: false,
    ...overrides,
  };
}

/** Render UI inside the I18n + PaymentMethodGroup providers the components depend on. */
export function renderInGroup(
  ui: ComponentChildren,
  groupProps: Record<string, unknown> = {},
  i18n: I18nService = new I18nService("en-US")
) {
  return render(
    <I18nProvider i18nService={i18n}>
      <PaymentMethodGroupContext {...(makeGroupProps(groupProps) as any)}>{ui}</PaymentMethodGroupContext>
    </I18nProvider>
  );
}
