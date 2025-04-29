import { StraumurCheckoutConfiguration } from "../../models/models";
import { StoredPaymentMethod, SuccessResponse } from "../../services/models";

export type StoredCardFormError = {
  encryptedSecurityCode: {
    visible: boolean;
    message?: string;
  };
};

export type StoredCardFormErrorField = keyof StoredCardFormError;

export interface StoredCardComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
  storedPaymentMethod: StoredPaymentMethod;
  onStoredCardRemoved: (storedPaymentMethodId: string) => void;
}
