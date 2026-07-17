import {
  ApplePayButtonTheme,
  GooglePayButtonTheme,
  StraumurCheckoutConfiguration,
  StraumurWebAdvancedConfiguration,
  StraumurWebConfiguration,
  StraumurWebInternalConfiguration,
  Theme,
  ThemeConfiguration,
} from "../models/models";
import { createAdvancedPaymentFlow, createSessionPaymentFlow } from "../flows/payment-flow";
import { normalizeLocale } from "../localizations/locale";
import { normalizeAdvancedConfiguration } from "../services/advanced-normalizer";
import { SuccessResponse } from "../services/models";

// Session mode has no countryCode input and the payment-methods response carries none,
// so it is fixed to Iceland until the backend provides one.
const SESSION_COUNTRY_CODE = "IS";

export function isSessionConfiguration(config: StraumurWebInternalConfiguration): config is StraumurWebConfiguration {
  return typeof config.sessionId === "string" && config.sessionId.length > 0;
}

// The public `theme` accepts either a bare mode or a ThemeConfiguration object; flatten both into
// the internal fields, defaulting the mode to "light".
function normalizeTheme(theme: Theme | ThemeConfiguration | undefined): {
  theme: Theme;
  googlePayButtonTheme?: GooglePayButtonTheme;
  applePayButtonTheme?: ApplePayButtonTheme;
} {
  if (typeof theme === "object") {
    return {
      theme: theme.theme ?? "light",
      googlePayButtonTheme: theme.googlePayButtonTheme,
      applePayButtonTheme: theme.applePayButtonTheme,
    };
  }

  return { theme: theme ?? "light" };
}

// the union only protects TypeScript consumers — IIFE consumers get no compile-time checking
export function isValidAdvancedConfiguration(config: StraumurWebAdvancedConfiguration): boolean {
  return (
    typeof config.clientKey === "string" &&
    config.clientKey.length > 0 &&
    typeof config.countryCode === "string" &&
    config.countryCode.length > 0 &&
    typeof config.paymentMethods === "object" &&
    config.paymentMethods !== null &&
    typeof config.amount === "object" &&
    config.amount !== null &&
    typeof config.amount.value === "number" &&
    typeof config.amount.currency === "string" &&
    typeof config.onSubmit === "function" &&
    typeof config.onAdditionalDetails === "function"
  );
}

export interface CheckoutInitialization {
  configuration: StraumurCheckoutConfiguration;
  /** The raw advanced configuration when valid; null in session mode or when invalid. */
  advancedConfiguration: StraumurWebAdvancedConfiguration | null;
  /** Advanced mode only: the configuration normalized into a session-style Success response. */
  paymentMethods: SuccessResponse | null;
  initializationFailed: boolean;
}

/**
 * Maps the public constructor input (session, or the runtime-detected internal advanced
 * configuration) to the internal checkout state. Called exactly once per instance —
 * the returned configuration object's identity drives the components' reinit effects.
 */
export function buildCheckoutConfiguration(publicConfig: StraumurWebConfiguration): CheckoutInitialization {
  const config = publicConfig as StraumurWebInternalConfiguration;
  const locale = normalizeLocale(config.locale);
  const isSession = isSessionConfiguration(config);
  const themeConfig = normalizeTheme(config.theme);

  const configuration: StraumurCheckoutConfiguration = {
    mode: isSession ? "session" : "advanced",
    sessionId: config.sessionId,
    environment: config.environment,
    countryCode: isSession ? SESSION_COUNTRY_CODE : config.countryCode,
    paymentFlow: isSession
      ? createSessionPaymentFlow(config.environment, config.sessionId)
      : createAdvancedPaymentFlow(config),
    onPaymentCompleted: config.onPaymentCompleted,
    onPaymentFailed: config.onPaymentFailed,
    placeholders: config.placeholders,
    locale,
    customLocalizations: config.localizations,
    instantPayments: config.instantPayments,
    hideSubmitButton: config.hideSubmitButton,
    onCardValidityChanged: config.onCardValidityChanged,
    allowedPaymentMethods: config.allowedPaymentMethods,
    orderPaymentMethods: config.orderPaymentMethods,
    theme: themeConfig.theme,
    googlePayButtonTheme: themeConfig.googlePayButtonTheme,
    applePayButtonTheme: themeConfig.applePayButtonTheme,
  };

  if (isSession) {
    return { configuration, advancedConfiguration: null, paymentMethods: null, initializationFailed: false };
  }

  if (!isValidAdvancedConfiguration(config)) {
    return { configuration, advancedConfiguration: null, paymentMethods: null, initializationFailed: true };
  }

  return {
    configuration,
    advancedConfiguration: config,
    paymentMethods: normalizeAdvancedConfiguration(config, locale),
    initializationFailed: false,
  };
}
