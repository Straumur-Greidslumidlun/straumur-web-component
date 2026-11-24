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
import { normalizeLocale, normalizeLocalizations } from "../localizations/locale";
import { normalizeAdvancedConfiguration } from "../services/advanced-normalizer";
import { SuccessResponse } from "../services/models";
import { createComponentLogger, LogIdentifier, Logger, NOOP_LOGGER } from "../logging/component-logger";
import { env } from "../env";

// Session mode has no countryCode input and the payment-methods response carries none,
// so it is fixed to Iceland until the backend provides one.
const SESSION_COUNTRY_CODE = "IS";

export function isSessionConfiguration(config: StraumurWebInternalConfiguration): config is StraumurWebConfiguration {
  return typeof config.sessionId === "string" && config.sessionId.length > 0;
}

// The public `theme` accepts either a bare mode or a ThemeConfiguration object; flatten both into
// the internal fields, defaulting the mode to "light".
export function normalizeTheme(theme: Theme | ThemeConfiguration | undefined): {
  theme: Theme;
  googlePayButtonTheme?: GooglePayButtonTheme;
  applePayButtonTheme?: ApplePayButtonTheme;
} {
  if (typeof theme === "object") {
    return {
      theme: theme.mode ?? "light",
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

// Session mode logs against the sessionId; the internal advanced mode (Hosted Checkout) against the
// checkoutReference the host page passes. Without either, the checkout cannot be matched and nothing is logged.
export function getLogIdentifier(config: StraumurWebInternalConfiguration, isSession: boolean): LogIdentifier | null {
  if (isSession) {
    return { sessionId: config.sessionId! };
  }

  const checkoutReference = (config as StraumurWebAdvancedConfiguration).checkoutReference;

  return typeof checkoutReference === "string" && checkoutReference.length > 0 ? { checkoutReference } : null;
}

function createLogger(
  config: StraumurWebInternalConfiguration,
  isSession: boolean,
  theme: Theme,
  locale: string
): Logger {
  try {
    if (config.environment !== "test" && config.environment !== "live") {
      return NOOP_LOGGER;
    }

    const baseUrl = config.environment === "live" ? env.PRODUCTION_BASE_URL : env.STAGING_BASE_URL;

    return createComponentLogger({
      enabled: config.enableLogging !== false,
      url: `${baseUrl}/${env.POST_COMPONENT_LOGS_URL}`,
      identifier: getLogIdentifier(config, isSession),
      componentVersion: __STRAUMUR_VERSION__,
      context: { mode: isSession ? "session" : "advanced", locale, theme },
    });
  } catch {
    return NOOP_LOGGER;
  }
}

export interface CheckoutInitialization {
  configuration: StraumurCheckoutConfiguration;
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
    customLocalizations: normalizeLocalizations(config.localizations),
    instantPayments: config.instantPayments,
    hideSubmitButton: config.hideSubmitButton,
    onCardValidityChanged: config.onCardValidityChanged,
    onApplePayValidateMerchant: config.onApplePayValidateMerchant,
    allowedPaymentMethods: config.allowedPaymentMethods,
    orderPaymentMethods: config.orderPaymentMethods,
    openDefaultPaymentMethod: config.openDefaultPaymentMethod,
    theme: themeConfig.theme,
    googlePayButtonTheme: themeConfig.googlePayButtonTheme,
    applePayButtonTheme: themeConfig.applePayButtonTheme,
    logger: createLogger(config, isSession, themeConfig.theme, locale),
  };

  if (isSession) {
    return { configuration, paymentMethods: null, initializationFailed: false };
  }

  if (!isValidAdvancedConfiguration(config)) {
    return { configuration, paymentMethods: null, initializationFailed: true };
  }

  return {
    configuration,
    paymentMethods: normalizeAdvancedConfiguration(config, locale),
    initializationFailed: false,
  };
}
