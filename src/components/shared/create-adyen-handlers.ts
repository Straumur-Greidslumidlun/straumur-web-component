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
import { dispatchFinalResult } from "./dispatch-final-result";

export interface AdyenPaymentHandlersOptions {
  configuration: StraumurCheckoutConfiguration;
  handleSuccess: (message: ResultMessage) => void;
  handleError: (message: ResultMessage) => void;
  setThreeDSecureActive: (value: boolean) => void;
  /** Locks the rest of the widget while this submission's /payments call is in flight. */
  setPaymentInProgress?: (value: boolean) => void;
  enrichSubmitData?: (data: SubmitData["data"]) => AdvancedSubmitState["data"];
  onSubmitStart?: () => void;
  /**
   * Redirect-return path only (submitDetails after a 3DS redirect): that Adyen bootstrap wires
   * no core-level onPaymentCompleted/onPaymentFailed, so the additional-details handler must
   * dispatch the final result itself. Leave unset for mounted components — Adyen invokes the
   * core-level callbacks there, and dispatching here too would double-fire the merchant callbacks.
   */
  dispatchResultFromAdditionalDetails?: boolean;
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
  const {
    configuration,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    setPaymentInProgress,
    enrichSubmitData,
    onSubmitStart,
    dispatchResultFromAdditionalDetails,
  } = options;

  // Buyer-friendly failure message from the host (advanced mode). Set on submit, shown when the payment fails.
  let failureMessage: string | undefined;

  function dispatchResult(resultCode: ResultCode): void {
    dispatchFinalResult(resultCode, { configuration, handleSuccess, handleError, failureMessage });
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    onSubmitStart?.();

    const { paymentFlow } = configuration;

    if (!(await runBeforeSubmit(paymentFlow))) {
      actions.reject();
      return;
    }

    // Lock the rest of the widget for the in-flight window. Set only after the beforeSubmit gate so a
    // cancelled submission (which stays on the chooser) never leaves the UI disabled. On any outcome
    // the result/failure screen or the 3DS takeover hides the other methods anyway; the catch clears
    // it defensively for the rare path that returns to the chooser.
    setPaymentInProgress?.(true);

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
      setPaymentInProgress?.(false);
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

      if (dispatchResultFromAdditionalDetails) {
        dispatchResult(resultCode);
      }
    } catch (error) {
      actions.reject();
      handleError(toResultMessage(error, "error.failedToSubmitPaymentDetails"));

      if (dispatchResultFromAdditionalDetails) {
        configuration.onPaymentFailed?.({ resultCode: "Error" });
      }
    }
  }

  function handlePaymentCompleted(data: PaymentCompletedData, _?: UIElement<UIElementProps> | undefined): void {
    dispatchResult(toResultCode(data.resultCode));
  }

  function handlePaymentFailed(data?: PaymentFailedData | undefined, _?: UIElement<UIElementProps> | undefined): void {
    // Adyen occasionally reports failure without a payload; synthesize one so the
    // merchant callback always receives a resultCode.
    dispatchResult(data ? toResultCode(data.resultCode) : "Error");
  }

  return { handleOnSubmit, handleOnSubmitAdditionalData, handlePaymentCompleted, handlePaymentFailed };
}
