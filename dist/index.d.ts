declare const translations: {
    "en-US": {
        "cards.title": string;
        "cards.cardNumber": string;
        "cards.expiryDate": string;
        "cards.securityCode3Digits": string;
        "cards.securityCode3DigitsOptional": string;
        "cards.securityCode3DigitsInfo": string;
        "cards.securityCode4DigitsInfo": string;
        "cards.storePaymentMethod": string;
        "googlePay.title": string;
        "applePay.title": string;
        "stored-cards.expiryDate": string;
        "stored-cards.securityCode3Digits": string;
        "stored-cards.securityCode3DigitsOptional": string;
        "stored-cards.securityCode3DigitsInfo": string;
        "stored-cards.securityCode4DigitsInfo": string;
        "stored-cards.removeStoredCard": string;
        "stored-cards.removeStoredCardQuestion": string;
        "stored-cards.removeStoredCardQuestionYesRemove": string;
        "stored-cards.removeStoredCardQuestionCancel": string;
        "success.paymentAuthorized": string;
        "error.unknownError": string;
        "error.failedToInitializeStraumurWebComponent": string;
        "error.failedToInitializePaymentMethods": string;
        "error.failedToSubmitPayment": string;
        "error.paymentFailed": string;
        "error.paymentUnsuccessful": string;
        "error.failedToSubmitPaymentDetails": string;
        "error.paymentDetailsFailed": string;
        "error.googlePayNotAvailable": string;
        "error.applePayNotAvailable": string;
        "error.failedToSubmitRemoveStoredPaymentCard": string;
        "error.failedToRemoveStoredPaymentCard": string;
    };
    "is-IS": {
        "cards.title": string;
        "cards.cardNumber": string;
        "cards.expiryDate": string;
        "cards.securityCode3Digits": string;
        "cards.securityCode3DigitsOptional": string;
        "cards.securityCode3DigitsInfo": string;
        "cards.securityCode4DigitsInfo": string;
        "cards.storePaymentMethod": string;
        "googlePay.title": string;
        "applePay.title": string;
        "stored-cards.expiryDate": string;
        "stored-cards.securityCode3Digits": string;
        "stored-cards.securityCode3DigitsOptional": string;
        "stored-cards.securityCode3DigitsInfo": string;
        "stored-cards.securityCode4DigitsInfo": string;
        "stored-cards.removeStoredCard": string;
        "stored-cards.removeStoredCardQuestion": string;
        "stored-cards.removeStoredCardQuestionYesRemove": string;
        "stored-cards.removeStoredCardQuestionCancel": string;
        "success.paymentAuthorized": string;
        "error.unknownError": string;
        "error.failedToInitializeStraumurWebComponent": string;
        "error.failedToInitializePaymentMethods": string;
        "error.failedToSubmitPayment": string;
        "error.paymentFailed": string;
        "error.paymentUnsuccessful": string;
        "error.failedToSubmitPaymentDetails": string;
        "error.paymentDetailsFailed": string;
        "error.googlePayNotAvailable": string;
        "error.applePayNotAvailable": string;
        "error.failedToSubmitRemoveStoredPaymentCard": string;
        "error.failedToRemoveStoredPaymentCard": string;
    };
};
type Language = keyof typeof translations;
type TranslationKey = keyof (typeof translations)["en-US"] | keyof (typeof translations)["is-IS"];

type PaymentMethod = "card" | "storedcard" | "googlepay" | "applepay";

type StraumurWebConfiguration = {
    sessionId: string;
    environment: "test" | "live";
    onPaymentCompleted?: (data: PaymentCompletedData) => void;
    onPaymentFailed?: (data?: PaymentFailedData) => void;
    submitDetails?: (details: any) => void;
    placeholders?: Placeholders;
    locale?: "is" | "en";
    localizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
    instantPayments?: Extract<PaymentMethod, "googlepay" | "applepay">[];
};
type ResultCode = "AuthenticationFinished" | "AuthenticationNotRequired" | "Authorised" | "Cancelled" | "ChallengeShopper" | "Error" | "IdentifyShopper" | "PartiallyAuthorised" | "Pending" | "PresentToShopper" | "Received" | "RedirectShopper" | "Refused";
type PaymentCompletedData = {
    resultCode: ResultCode;
};
type PaymentFailedData = {
    resultCode: ResultCode;
};
type StraumurCheckoutConfiguration = {
    sessionId: string;
    environment: "test" | "live";
    onPaymentCompleted?: (data: PaymentCompletedData) => void;
    onPaymentFailed?: (data?: PaymentFailedData) => void;
    placeholders?: Placeholders;
    locale: Language;
    customLocalizations?: Partial<Record<Language, Partial<Record<TranslationKey, string>>>>;
    instantPayments?: Extract<PaymentMethod, "googlepay" | "applepay">[];
};
type PlaceholderKeys = "cardNumber" | "expiryDate" | "expiryMonth" | "expiryYear" | "securityCodeThreeDigits" | "securityCodeFourDigits";
type Placeholders = Partial<Record<PlaceholderKeys, string>>;

declare class StraumurCheckout {
    private configuration;
    private paymentMethods;
    private mountElement;
    private i18n;
    constructor(config: StraumurWebConfiguration);
    mount(selector: HTMLElement | string): Promise<void>;
    private renderComponent;
    handleSuccess(message: TranslationKey): void;
    handleError(message: TranslationKey): void;
    submitDetails(redirectResult: string): Promise<void>;
    private handleOnSubmitAdditionalData;
    updateConfig(newConfig: Partial<StraumurCheckoutConfiguration>): void;
    setLanguage(locale: Language): void;
    destroy(): void;
}

export { StraumurCheckout };
