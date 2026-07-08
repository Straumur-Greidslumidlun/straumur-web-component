import {
  AdditionalDetailsActions,
  AdditionalDetailsData,
  PaymentCompletedData,
  PaymentFailedData,
  SubmitActions,
  SubmitData,
  UIElement,
  UIElementProps,
} from "@adyen/adyen-web";
import {
  AdvancedSubmitState,
  ResultCode,
  ResultMessage,
  StraumurCheckoutConfiguration,
  toResultCode,
} from "../../models/models";
import { toResultMessage } from "../../flows/payment-flow";
import { runBeforeSubmit } from "./before-submit-click";

export interface AdyenPaymentHandlersOptions {
  configuration: StraumurCheckoutConfiguration;
  handleSuccess: (message: ResultMessage) => void;
  handleError: (message: ResultMessage) => void;
  setThreeDSecureActive: (value: boolean) => void;
  enrichSubmitData?: (data: SubmitData["data"]) => AdvancedSubmitState["data"];
  onSubmitStart?: () => void;
}

export interface AdyenPaymentHandlers {
  handleOnSubmit: (state: SubmitData, element: UIElement<UIElementProps>, actions: SubmitActions) => Promise<void>;
  handleOnSubmitAdditionalData: (
    state: AdditionalDetailsData,
    element: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) => Promise<void>;
  handlePaymentCompleted: (data: PaymentCompletedData, element?: UIElement<UIElementProps>) => void;
  handlePaymentFailed: (data?: PaymentFailedData, element?: UIElement<UIElementProps>) => void;
}

export function createAdyenPaymentHandlers(options: AdyenPaymentHandlersOptions): AdyenPaymentHandlers {
  const { configuration, handleSuccess, handleError, setThreeDSecureActive, enrichSubmitData, onSubmitStart } = options;

  // Buyer-friendly failure message from the host (advanced mode). Set on submit, shown when the payment fails.
  let failureMessage: string | undefined;

  function failureResultMessage(): ResultMessage {
    return failureMessage ? { text: failureMessage } : { key: "error.paymentUnsuccessful" };
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    onSubmitStart?.();

    const { paymentFlow } = configuration;

    if (!(await runBeforeSubmit(paymentFlow))) {
      actions.reject();
      return;
    }

    try {
      const data = enrichSubmitData ? enrichSubmitData(state.data) : (state.data as AdvancedSubmitState["data"]);

      const { resultCode, action, errorMessage } = await paymentFlow.submitPayment(data);

      failureMessage = errorMessage;

      if (resultCode === "ChallengeShopper" || resultCode === "IdentifyShopper") {
        setThreeDSecureActive(true);
      }

      // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
      // You must call this, even if the result of the payment is unsuccessful.
      actions.resolve({ resultCode, action } as Parameters<SubmitActions["resolve"]>[0]);
    } catch (error) {
      actions.reject();
      handleError(toResultMessage(error, "error.failedToSubmitPayment"));
    }
  }

  async function handleOnSubmitAdditionalData(
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) {
    try {
      const { resultCode, action, errorMessage } = await configuration.paymentFlow.submitAdditionalDetails(state.data);

      failureMessage = errorMessage;

      // If the /payments/details request from your server is successful, you must call this to resolve whichever of the listed objects are available.
      // You must call this, even if the result of the payment is unsuccessful.
      actions.resolve({ resultCode, action } as Parameters<AdditionalDetailsActions["resolve"]>[0]);
    } catch (error) {
      actions.reject();
      handleError(toResultMessage(error, "error.failedToSubmitPaymentDetails"));
    }
  }

  // Merchant callbacks follow Adyen Web 6 semantics: these resultCodes are failures.
  const FAILED_RESULT_CODES: readonly ResultCode[] = ["Refused", "Cancelled", "Error"];

  function dispatchFinalResult(resultCode: ResultCode): void {
    // The built-in screens keep their own rule: the success screen only for Authorised.
    if (resultCode === "Authorised") {
      handleSuccess({ key: "success.paymentAuthorized" });
    } else {
      handleError(failureResultMessage());
    }

    if (FAILED_RESULT_CODES.includes(resultCode)) {
      configuration.onPaymentFailed?.({ resultCode });
    } else {
      configuration.onPaymentCompleted?.({ resultCode });
    }
  }

  function handlePaymentCompleted(data: PaymentCompletedData, _?: UIElement<UIElementProps> | undefined): void {
    dispatchFinalResult(toResultCode(data.resultCode));
  }

  function handlePaymentFailed(data?: PaymentFailedData | undefined, _?: UIElement<UIElementProps> | undefined): void {
    // Adyen occasionally reports failure without a payload; synthesize one so the
    // merchant callback always receives a resultCode.
    dispatchFinalResult(data ? toResultCode(data.resultCode) : "Error");
  }

  return { handleOnSubmit, handleOnSubmitAdditionalData, handlePaymentCompleted, handlePaymentFailed };
}
