import { Language, TranslationKey } from "../localizations/translations";
import { PublicLocale } from "../localizations/locale";
import { OpenDefaultPaymentMethod, PaymentMethod, PaymentMethodOrder } from "./constants";
import { ICreateDetailsBody, ICreatePaymentBody } from "../adapter/models";
import { PaymentMethodsResponse } from "../services/models";

// configuration options shared by both session and advanced mode
type StraumurWebBaseConfiguration = {
  environment: "test" | "live";
  onPaymentCompleted?: (data: PaymentCompletedData) => void;
  onPaymentFailed?: (data: PaymentFailedData) => void;
  placeholders?: Placeholders;
  locale?: PublicLocale;
  localizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  instantPayments?: UniqueInstantPayments;
  hideSubmitButton?: boolean;
  onCardValidityChanged?: (isValid: boolean, isActive: boolean) => void;
  allowedPaymentMethods?: PaymentMethod[];
  /**
   * Top-to-bottom order of the payment-method options. Tokens: "card", "storedcard", "googlepay",
   * "applepay", and "instantpayments" (the express wallet row). A wallet listed in `instantPayments`
   * renders only inside the "instantpayments" slot, never standalone, so its standalone token here is
   * effectively ignored. Any available method you omit is appended in the default order. Defaults to
   * ["instantpayments", "storedcard", "card", "googlepay", "applepay"].
   */
  orderPaymentMethods?: PaymentMethodOrder[];
  /**
   * Which payment method to open (expand) on load: "card", "firstStoredCard", "googlepay" or
   * "applepay". If that method isn't available — a wallet that's in `instantPayments`, or
   * "firstStoredCard" with no saved cards — it's ignored and no method is pre-opened (the chooser
   * stays collapsed). Omit for the same collapsed default.
   */
  openDefaultPaymentMethod?: OpenDefaultPaymentMethod;
  /**
   * Color theme for the widget. Accepts a mode ("light" | "dark" | "system"), or a
   * {@link ThemeConfiguration} object to also override the wallet button styling. "system" follows
   * the shopper's OS/browser preference (`prefers-color-scheme`) and updates live if it changes.
   * Defaults to "light".
   */
  theme?: Theme | ThemeConfiguration;
};

export type Theme = "light" | "dark" | "system";

/** The resolved theme actually applied to the DOM ("system" collapses to one of these). */
export type ResolvedTheme = "light" | "dark";

/** Google Pay button style override: "white" = light button, "dark" = black button. */
export type GooglePayButtonTheme = "dark" | "white";

/** Apple Pay button style override: "light" = white button, "dark" = black button. */
export type ApplePayButtonTheme = "dark" | "light";

/**
 * Object form of `theme`: the widget color mode plus optional per-wallet button overrides.
 * When an override is omitted the wallet button follows the mode — a light widget gets a
 * light/white button, a dark widget gets a black one.
 */
export type ThemeConfiguration = {
  theme: Theme;
  googlePayButtonTheme?: GooglePayButtonTheme;
  applePayButtonTheme?: ApplePayButtonTheme;
};

// the public configuration (session mode): the component loads everything itself from the Straumur API using the sessionId
export type StraumurWebConfiguration = StraumurWebBaseConfiguration & {
  sessionId: string;
};

// INTERNAL — advanced mode: the host page provides the payment methods and controls all network calls
// through onSubmit / onAdditionalDetails (and optionally onDisableToken).
// Used only by Straumur's own Hosted Checkout page; not exported from the package entry point,
// not documented for integrators, and not part of the supported public API.
export type StraumurWebAdvancedConfiguration = StraumurWebBaseConfiguration & {
  sessionId?: never;
  clientKey: string;
  countryCode: string;
  paymentMethods: PaymentMethodsResponse;
  /**
   * The amount of the transaction, in minor units. For example, value 1000 means 10.00.
   */
  amount: { value: number; currency: string };
  formattedAmount: string;
  merchantName: string;
  enableStoreDetails: "Enabled" | "Disabled" | "AskForConsent";
  onSubmit: (state: AdvancedSubmitState, actions: AdvancedPaymentActions) => void | Promise<void>;
  onAdditionalDetails: (state: AdvancedAdditionalDetailsState, actions: AdvancedPaymentActions) => void | Promise<void>;
  onDisableToken?: (data: DisableTokenData, actions: DisableTokenActions) => void | Promise<void>;
  /**
   * Called before a payment is submitted. Return false to abort the submission.
   * Keep it synchronous when Apple Pay is offered — the payment sheet must open within the user gesture.
   */
  onBeforeSubmit?: () => boolean | Promise<boolean>;
};

// INTERNAL — union the constructor actually accepts at runtime (public signature stays session-only)
export type StraumurWebInternalConfiguration = StraumurWebConfiguration | StraumurWebAdvancedConfiguration;

const RESULT_CODES = [
  "AuthenticationFinished",
  "AuthenticationNotRequired",
  "Authorised",
  "Cancelled",
  "ChallengeShopper",
  "Error",
  "IdentifyShopper",
  "PartiallyAuthorised",
  "Pending",
  "PresentToShopper",
  "Received",
  "RedirectShopper",
  "Refused",
] as const;

export type ResultCode = (typeof RESULT_CODES)[number];

/** Narrows a resultCode string from the Adyen boundary to our ResultCode union; unknown values map to "Error". */
export function toResultCode(value: string | undefined): ResultCode {
  return value && (RESULT_CODES as readonly string[]).includes(value) ? (value as ResultCode) : "Error";
}

export type PaymentCompletedData = {
  resultCode: ResultCode;
};

export type PaymentFailedData = {
  resultCode: ResultCode;
};

export type AdvancedSubmitState = {
  data: Omit<ICreatePaymentBody, "sessionId">;
};

export type AdvancedAdditionalDetailsState = {
  data: Omit<ICreateDetailsBody, "sessionId">;
};

export type PaymentFlowResult = {
  resultCode: ResultCode;
  action?: unknown;
  /**
   * Optional buyer-friendly failure message shown on the built-in failure screen
   * instead of the generic localized one (advanced mode only).
   */
  errorMessage?: string;
  /**
   * The per-attempt reference from the /payment response. In advanced mode the host surfaces it here so the
   * component can auto-attach it to a native (in-component) 3DS /details continuation. Redirect continuations
   * pass it explicitly via submitDetails instead.
   */
  paymentCheckoutReference?: string;
};

export type AdvancedPaymentActions = {
  resolve: (result: PaymentFlowResult) => void;
  reject: (errorMessage?: string) => void;
};

export type DisableTokenData = {
  storedPaymentMethodId: string;
};

export type DisableTokenActions = {
  resolve: () => void;
  reject: () => void;
};

// abstraction over how payments reach the backend: session mode calls the Straumur API itself,
// advanced mode delegates to the host page's handlers
export interface PaymentFlow {
  submitPayment(data: AdvancedSubmitState["data"]): Promise<PaymentFlowResult>;
  submitAdditionalDetails(data: AdvancedAdditionalDetailsState["data"]): Promise<PaymentFlowResult>;
  disableToken?: (storedPaymentMethodId: string) => Promise<void>;
  beforeSubmit?: () => boolean | Promise<boolean>;
}

// message shown on the built-in result screens: either a translation key or raw text supplied by the host
export type ResultMessage = { key: TranslationKey } | { text: string };

type UniqueInstantPayments =
  | [Extract<PaymentMethod, "googlepay">]
  | [Extract<PaymentMethod, "applepay">]
  | [Extract<PaymentMethod, "googlepay">, Extract<PaymentMethod, "applepay">]
  | [Extract<PaymentMethod, "applepay">, Extract<PaymentMethod, "googlepay">];

// this will be used for internal configuration of the checkout component
export type StraumurCheckoutConfiguration = {
  mode: "session" | "advanced";
  sessionId?: string;
  environment: "test" | "live";
  countryCode: string;
  paymentFlow: PaymentFlow;
  onPaymentCompleted?: (data: PaymentCompletedData) => void;
  onPaymentFailed?: (data: PaymentFailedData) => void;
  placeholders?: Placeholders;
  locale: Language;
  customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  instantPayments?: UniqueInstantPayments;
  hideSubmitButton?: boolean;
  onCardValidityChanged?: (isValid: boolean, isActive: boolean) => void;
  allowedPaymentMethods?: PaymentMethod[];
  orderPaymentMethods?: PaymentMethodOrder[];
  openDefaultPaymentMethod?: OpenDefaultPaymentMethod;
  theme: Theme;
  googlePayButtonTheme?: GooglePayButtonTheme;
  applePayButtonTheme?: ApplePayButtonTheme;
};

// What updateConfig() accepts: internal config fields minus the immutable ones,
// with locale in the public short-code vocabulary.
export type StraumurCheckoutUpdateOptions = Partial<
  Omit<StraumurCheckoutConfiguration, "mode" | "paymentFlow" | "locale">
> & {
  locale?: PublicLocale;
};

type PlaceholderKeys =
  "cardNumber" | "expiryDate" | "expiryMonth" | "expiryYear" | "securityCodeThreeDigits" | "securityCodeFourDigits";

// Partial makes all records optional so we can have a configuration without placeholders
// Record creates a type with keys of type PlaceholderKeys and values of type string
export type Placeholders = Partial<Record<PlaceholderKeys, string>>;

export type ErrorCode = TranslationKey;
