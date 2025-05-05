import { Language } from "../localizations/translations";
import { ErrorCode } from "../models/models";

export type SuccessResponse = {
  resultCode: "Success";
  message?: string;
} & Required<StraumurCheckoutPaymentMethods>;

export type ErrorResponse = {
  resultCode: "Error";
  error: ErrorCode;
} & Partial<StraumurCheckoutPaymentMethods>;

// this way we can use the same type for both success and error responses and make sure that the required fields are present in case of Success
export type StraumurCheckoutPaymentMethodsResponse = SuccessResponse | ErrorResponse;

export type StraumurCheckoutPaymentMethods = {
  /**
   * The amount of the transaction. For example, 10.00.
   */
  amount: number;
  /**
   * Public key used for client-side authentication.
   */
  clientKey: string;
  /**
   * The three-character ISO currency code.
   */
  currency: string;
  /**
   * Config option related to whether we set storePaymentMethod in the card data, and showing/hiding the "store details" checkbox
   * - merchant set config option
   */
  enableStoreDetails: "Enabled" | "Disabled" | "AskForConsent";
  /**
   * The formatted amount of the transaction. For example, EUR 10.00.
   */
  formattedAmount: string;
  /**
   * The combination of a language code and a country code to specify the language to be used in the payment.
   */
  locale: Language;
  /**
   * The amount of the transaction, in minor units. For example, 1000 means 10.00.
   */
  minorUnitsAmount: number;
  /**
   * The merchant name.
   */
  merchantName: string;
  /**
   * The payment methods.
   */
  paymentMethods: PaymentMethodsResponse;
};

interface PaymentMethodsResponse {
  /**
   * Detailed list of payment methods required to generate payment forms.
   */
  paymentMethods?: PaymentMethod[];
  /**
   * List of all stored payment methods.
   */
  storedPaymentMethods?: StoredPaymentMethod[];
}

/**
 * A list of issuers for this payment method.
 */
type Issuer = {
  /**
   * A boolean value indicating whether this issuer is unavailable. Can be true whenever the issuer is offline.
   */
  disabled?: boolean;
  /**
   * The unique identifier of this issuer, to submit in requests to /payments.
   */
  id: string;
  /**
   * A localized name of the issuer.
   */
  name: string;
};

type PaymentMethod = {
  /**
   * Brand for the selected gift card. For example: plastix, hmclub.
   */
  brand?: string;
  /**
   * List of possible brands. For example: visa, mc.
   */
  brands?: string[];
  /**
   * The configuration of the payment method.
   * Configuration props as set by the merchant in the CA and received in the PM object in the /paymentMethods response
   */
  configuration?: object;
  /**
   * The funding source of the payment method.
   */
  fundingSource?: "debit" | "credit";
  /**
   * The group where this payment method belongs to.
   */
  group?: PaymentMethodGroup;
  /**
   * A list of issuers for this payment method.
   */
  issuers?: Issuer[];
  /**
   * The displayable name of this payment method.
   */
  name: string;
  /**
   * The unique payment method code.
   */
  type: string;
};

export type StoredPaymentMethod = PaymentMethod & {
  /**
   * The bank account number (without separators).
   */
  bankAccountNumber?: string;
  /**
   * The location id of the bank. The field value is nil in most cases.
   */
  bankLocationId?: string;
  /**
   * The month the card expires.
   */
  expiryMonth?: string;
  /**
   * The last two digits of the year the card expires. For example, 24 for the year 2024.
   */
  expiryYear?: string;
  /**
   * The holder name of the bank account.
   */
  holderName?: string;
  /**
   * The IBAN of the bank account.
   */
  iban?: string;
  /**
   * A unique identifier of this stored payment method.
   */
  id: string;
  /**
   * The shopper’s issuer account label
   */
  label?: string;
  /**
   * The last four digits of the PAN.
   */
  lastFour?: string;
  /**
   * Returned in the response if you are not tokenizing with Adyen and are using the Merchant-initiated transactions (MIT) framework from Mastercard or Visa.
   * This contains either the Mastercard Trace ID or the Visa Transaction ID.
   */
  networkTxReference?: string;
  /**
   * The name of the bank account holder.
   */
  ownerName?: string;
  /**
   * The shopper’s email address.
   */
  shopperEmail?: string;
  /**
   * The supported recurring processing models for this stored payment method.
   */
  supportedRecurringProcessingModels: string[];
  /**
   * The supported shopper interactions for this stored payment method.
   */
  supportedShopperInteractions: string[];
};

/**
 * The group where this payment method belongs to.
 */
type PaymentMethodGroup = {
  /**
   * The name of the group.
   */
  name: string;
  /**
   * Echo data to be used if the payment method is displayed as part of this group.
   */
  paymentMethodData: string;
  /**
   * The unique code of the group.
   */
  type: string;
};
