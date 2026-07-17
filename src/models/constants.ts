export type PaymentMethod = "card" | "storedcard" | "googlepay" | "applepay";

/**
 * A slot in the rendered payment-method list: a standalone method, or "instantpayments" for the
 * express wallet row. Used to order the options via `orderPaymentMethods`.
 */
export type PaymentMethodOrder = PaymentMethod | "instantpayments";

export const NETWORK_ERROR = "NETWORK_ERROR";
export const CANCEL = "CANCEL";
export const IMPLEMENTATION_ERROR = "IMPLEMENTATION_ERROR";
export const API_ERROR = "API_ERROR";
export const ERROR = "ERROR";
export const SCRIPT_ERROR = "SCRIPT_ERROR";
export const SDK_ERROR = "SDK_ERROR";
