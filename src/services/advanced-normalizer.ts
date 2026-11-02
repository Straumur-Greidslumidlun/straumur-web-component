import { Language } from "../localizations/translations";
import { StraumurWebAdvancedConfiguration } from "../models/models";
import { SuccessResponse } from "./models";

// shapes the advanced-mode configuration into the same response object the session-mode
// payment-methods call returns, so the component tree consumes both modes identically
export function normalizeAdvancedConfiguration(
  configuration: StraumurWebAdvancedConfiguration,
  locale: Language
): SuccessResponse {
  return {
    resultCode: "Success",
    clientKey: configuration.clientKey,
    paymentMethods: configuration.paymentMethods,
    minorUnitsAmount: configuration.amount.value,
    currency: configuration.amount.currency,
    amount: configuration.amount.value / 100,
    formattedAmount: configuration.formattedAmount,
    merchantName: configuration.merchantName,
    enableStoreDetails: configuration.enableStoreDetails,
    locale,
  };
}
