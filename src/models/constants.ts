export type PaymentMethod = "card" | "storedcard" | "googlepay" | "applepay";

/**
 * A slot in the rendered payment-method list: a standalone method, or "instantpayments" for the
 * express wallet row. Used to order the options via `orderPaymentMethods`.
 */
export type PaymentMethodOrder = PaymentMethod | "instantpayments";

/**
 * Which payment method to open (expand) on load via `openDefaultPaymentMethod`. "firstStoredCard"
 * opens the first saved card. Ignored (nothing pre-opened, chooser stays collapsed) when the
 * requested method isn't available (e.g. a wallet that's in `instantPayments`, or no saved cards).
 */
export type OpenDefaultPaymentMethod = "card" | "firstStoredCard" | "googlepay" | "applepay";

export const NETWORK_ERROR = "NETWORK_ERROR";
export const CANCEL = "CANCEL";
export const IMPLEMENTATION_ERROR = "IMPLEMENTATION_ERROR";
export const API_ERROR = "API_ERROR";
export const ERROR = "ERROR";
export const SCRIPT_ERROR = "SCRIPT_ERROR";
export const SDK_ERROR = "SDK_ERROR";
