import { Language, TranslationKey } from "../localizations/translations";
import { PaymentMethod } from "./constants";
import { ICreateDetailsBody, ICreatePaymentBody } from "../adapter/models";
import { PaymentMethodsResponse } from "../services/models";

// configuration options shared by both session and advanced mode
type StraumurWebBaseConfiguration = {
  environment: "test" | "live";
  onPaymentCompleted?: (data: PaymentCompletedData) => void;
  onPaymentFailed?: (data?: PaymentFailedData) => void;
  placeholders?: Placeholders;
  locale?: "is" | "en";
  localizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  instantPayments?: UniqueInstantPayments;
  hideSubmitButton?: boolean;
  onCardValidityChanged?: (isValid: boolean, isActive: boolean) => void;
  allowedPaymentMethods?: PaymentMethod[];
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

export type ResultCode =
  | "AuthenticationFinished"
  | "AuthenticationNotRequired"
  | "Authorised"
  | "Cancelled"
  | "ChallengeShopper"
  | "Error"
  | "IdentifyShopper"
  | "PartiallyAuthorised"
  | "Pending"
  | "PresentToShopper"
  | "Received"
  | "RedirectShopper"
  | "Refused";

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
  onPaymentFailed?: (data?: PaymentFailedData) => void;
  placeholders?: Placeholders;
  locale: Language;
  customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  instantPayments?: UniqueInstantPayments;
  hideSubmitButton?: boolean;
  onCardValidityChanged?: (isValid: boolean, isActive: boolean) => void;
  allowedPaymentMethods?: PaymentMethod[];
};

type PlaceholderKeys =
  | "cardNumber"
  | "expiryDate"
  | "expiryMonth"
  | "expiryYear"
  | "securityCodeThreeDigits"
  | "securityCodeFourDigits";

// Partial makes all records optional so we can have a configuration without placeholders
// Record creates a type with keys of type PlaceholderKeys and values of type string
export type Placeholders = Partial<Record<PlaceholderKeys, string>>;

export type ErrorCode = TranslationKey;
