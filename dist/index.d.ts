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
        "cards.saveCardDetails": string;
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
        "stored-cards.saveCardDetails": string;
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
        "cards.saveCardDetails": string;
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
        "stored-cards.saveCardDetails": string;
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

interface ICreatePaymentBody {
    sessionId: string;
    riskData?: {
        clientData: string;
    };
    clientStateDataIndicator: boolean;
    storePaymentMethod?: boolean;
    paymentMethod: {
        [key: string]: any;
        checkoutAttemptId?: string;
    };
    browserInfo?: BrowserInfo;
}
interface BrowserInfo {
    acceptHeader: string;
    colorDepth: number;
    language: string;
    javaEnabled: boolean;
    screenHeight: number;
    screenWidth: number;
    userAgent: string;
    timeZoneOffset: number;
}
interface ICreateDetailsBody {
    sessionId: string;
    details: {
        redirectResult?: string;
        threeDSResult?: string;
        [key: string]: any;
    };
}

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
type StraumurWebConfiguration = StraumurWebBaseConfiguration & {
    sessionId: string;
};
type ResultCode = "AuthenticationFinished" | "AuthenticationNotRequired" | "Authorised" | "Cancelled" | "ChallengeShopper" | "Error" | "IdentifyShopper" | "PartiallyAuthorised" | "Pending" | "PresentToShopper" | "Received" | "RedirectShopper" | "Refused";
type PaymentCompletedData = {
    resultCode: ResultCode;
};
type PaymentFailedData = {
    resultCode: ResultCode;
};
type AdvancedSubmitState = {
    data: Omit<ICreatePaymentBody, "sessionId">;
};
type AdvancedAdditionalDetailsState = {
    data: Omit<ICreateDetailsBody, "sessionId">;
};
type PaymentFlowResult = {
    resultCode: ResultCode;
    action?: unknown;
    /**
     * Optional buyer-friendly failure message shown on the built-in failure screen
     * instead of the generic localized one (advanced mode only).
     */
    errorMessage?: string;
};
interface PaymentFlow {
    submitPayment(data: AdvancedSubmitState["data"]): Promise<PaymentFlowResult>;
    submitAdditionalDetails(data: AdvancedAdditionalDetailsState["data"]): Promise<PaymentFlowResult>;
    disableToken?: (storedPaymentMethodId: string) => Promise<void>;
    beforeSubmit?: () => boolean | Promise<boolean>;
}
type ResultMessage = {
    key: TranslationKey;
} | {
    text: string;
};
type UniqueInstantPayments = [Extract<PaymentMethod, "googlepay">] | [Extract<PaymentMethod, "applepay">] | [Extract<PaymentMethod, "googlepay">, Extract<PaymentMethod, "applepay">] | [Extract<PaymentMethod, "applepay">, Extract<PaymentMethod, "googlepay">];
type StraumurCheckoutConfiguration = {
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
type PlaceholderKeys = "cardNumber" | "expiryDate" | "expiryMonth" | "expiryYear" | "securityCodeThreeDigits" | "securityCodeFourDigits";
type Placeholders = Partial<Record<PlaceholderKeys, string>>;

declare class StraumurCheckout {
    private configuration;
    private advancedConfiguration;
    private paymentMethods;
    private mountElement;
    private i18n;
    private submitApi;
    private initializationFailed;
    constructor(publicConfig: StraumurWebConfiguration);
    mount(selector: HTMLElement | string): Promise<void>;
    private renderComponent;
    handleSuccess(message: ResultMessage): void;
    handleError(message: ResultMessage): void;
    submitDetails(redirectResult: string, selector?: HTMLElement | string): Promise<void>;
    private handleOnSubmitAdditionalData;
    updateConfig(newConfig: Partial<Omit<StraumurCheckoutConfiguration, "mode" | "paymentFlow">>): void;
    setLanguage(locale: Language): void;
    destroy(): void;
    submitCard(): boolean;
}

export { type PaymentCompletedData, type PaymentFailedData, type Placeholders, type ResultCode, StraumurCheckout, type StraumurWebConfiguration };
