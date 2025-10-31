import { Language, TranslationKey } from "../localizations/translations";

// this will be used to create a type for the configuration object
export type StraumurWebConfiguration = {
  sessionId: string;
  environment: "test" | "live";
  onPaymentCompleted?: (data: PaymentCompletedData) => void;
  onPaymentFailed?: (data?: PaymentFailedData) => void;
  submitDetails?: (details: any) => void;
  placeholders?: Placeholders;
  locale?: "is" | "en";
  localizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  customCardSubmission?: boolean;
};

type ResultCode =
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

// this will be used for internal configuration of the checkout component
export type StraumurCheckoutConfiguration = {
  sessionId: string;
  environment: "test" | "live";
  onPaymentCompleted?: (data: PaymentCompletedData) => void;
  onPaymentFailed?: (data?: PaymentFailedData) => void;
  placeholders?: Placeholders;
  locale: Language;
  customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
  customCardSubmission?: boolean;
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
