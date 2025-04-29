import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";

export type CardFormError = {
  encryptedCardNumber: {
    visible: boolean;
    message?: string;
  };
  encryptedExpiryDate: {
    visible: boolean;
    message?: string;
  };
  encryptedSecurityCode: {
    visible: boolean;
    message?: string;
  };
};

export type CardFormErrorField = keyof CardFormError;

export interface CardComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}
