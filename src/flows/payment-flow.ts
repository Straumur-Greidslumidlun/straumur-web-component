import { ICreateDetailsBody, ICreatePaymentBody, IPostDisableTokenBody } from "../adapter/models";
import { createDetailsRequest, createPaymentRequest, postDisableTokenRequest } from "../adapter/straumur-adapter";
import { PaymentFlow, PaymentFlowResult, ResultMessage, StraumurWebAdvancedConfiguration } from "../models/models";
import { TranslationKey } from "../localizations/translations";

export class PaymentFlowError extends Error {
  messageKey: TranslationKey;
  messageText?: string;

  constructor(messageKey: TranslationKey, messageText?: string) {
    super(messageText ?? messageKey);
    this.messageKey = messageKey;
    this.messageText = messageText;
  }
}

export function toResultMessage(error: unknown, fallbackKey: TranslationKey): ResultMessage {
  if (error instanceof PaymentFlowError) {
    return error.messageText ? { text: error.messageText } : { key: error.messageKey };
  }

  return { key: fallbackKey };
}

export function createSessionPaymentFlow(environment: "test" | "live", sessionId: string): PaymentFlow {
  return {
    async submitPayment(data) {
      const body: ICreatePaymentBody = { ...data, sessionId };

      const fetchResponse = await createPaymentRequest(environment, body);

      // We will always get 200 OK unless there is an error in our server code.
      // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
      if (!fetchResponse.ok) {
        throw new PaymentFlowError("error.failedToSubmitPayment");
      }

      const response = await fetchResponse.json();

      // ResultCode should never be empty.
      if (!response.resultCode) {
        throw new PaymentFlowError("error.paymentFailed");
      }

      return { resultCode: response.resultCode, action: response.action };
    },
    async submitAdditionalDetails(data) {
      const body: ICreateDetailsBody = { ...data, sessionId };

      const fetchResponse = await createDetailsRequest(environment, body);

      // We will always get 200 OK unless there is an error in our server code.
      // Payment unsuccessful still returns 200 OK, but with resultCode Refused.
      if (!fetchResponse.ok) {
        throw new PaymentFlowError("error.failedToSubmitPaymentDetails");
      }

      const response = await fetchResponse.json();

      // ResultCode should always be either Authorised or Refused or IdentifyShopper. Never empty.
      if (!response.resultCode) {
        throw new PaymentFlowError("error.paymentDetailsFailed");
      }

      return { resultCode: response.resultCode, action: response.action };
    },
    async disableToken(storedPaymentMethodId) {
      const body: IPostDisableTokenBody = { storedPaymentMethodId, sessionId };

      const fetchResponse = await postDisableTokenRequest(environment, body);

      if (!fetchResponse.ok) {
        throw new PaymentFlowError("error.failedToSubmitRemoveStoredPaymentCard");
      }

      const disableTokenResponse = await fetchResponse.json();

      if (!disableTokenResponse.success) {
        throw new PaymentFlowError("error.failedToRemoveStoredPaymentCard");
      }
    },
  };
}

export function createAdvancedPaymentFlow(configuration: StraumurWebAdvancedConfiguration): PaymentFlow {
  const flow: PaymentFlow = {
    submitPayment(data) {
      return new Promise<PaymentFlowResult>((resolve, reject) => {
        Promise.resolve(
          configuration.onSubmit(
            { data },
            {
              resolve,
              reject: (errorMessage) => reject(new PaymentFlowError("error.failedToSubmitPayment", errorMessage)),
            }
          )
        ).catch((error) =>
          reject(error instanceof PaymentFlowError ? error : new PaymentFlowError("error.failedToSubmitPayment"))
        );
      });
    },
    submitAdditionalDetails(data) {
      return new Promise<PaymentFlowResult>((resolve, reject) => {
        Promise.resolve(
          configuration.onAdditionalDetails(
            { data },
            {
              resolve,
              reject: (errorMessage) =>
                reject(new PaymentFlowError("error.failedToSubmitPaymentDetails", errorMessage)),
            }
          )
        ).catch((error) =>
          reject(error instanceof PaymentFlowError ? error : new PaymentFlowError("error.failedToSubmitPaymentDetails"))
        );
      });
    },
    beforeSubmit: configuration.onBeforeSubmit,
  };

  const { onDisableToken } = configuration;

  if (onDisableToken) {
    flow.disableToken = (storedPaymentMethodId) =>
      new Promise<void>((resolve, reject) => {
        Promise.resolve(
          onDisableToken(
            { storedPaymentMethodId },
            {
              resolve,
              reject: () => reject(new PaymentFlowError("error.failedToRemoveStoredPaymentCard")),
            }
          )
        ).catch((error) =>
          reject(
            error instanceof PaymentFlowError
              ? error
              : new PaymentFlowError("error.failedToSubmitRemoveStoredPaymentCard")
          )
        );
      });
  }

  return flow;
}
