import {
  ActionHandledReturnObject,
  AdyenCheckoutError,
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
import { dispatchFinalResult } from "./dispatch-final-result";
import { CANCEL } from "../../models/constants";

export interface AdyenPaymentHandlersOptions {
  configuration: StraumurCheckoutConfiguration;
  handleSuccess: (message: ResultMessage) => void;
  handleError: (message: ResultMessage) => void;
  setThreeDSecureActive: (value: boolean) => void;
  /** Locks the rest of the widget while this submission's /payments call is in flight. */
  setPaymentInProgress?: (value: boolean) => void;
  /**
   * Drives the processing overlay: on once a submission passes the gate, off when the 3DS challenge
   * iframe is visible, on again while /payments/details runs. Off on any thrown failure.
   */
  setPaymentProcessing?: (value: boolean) => void;
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
  /** Pass as the core-level onActionHandled so the overlay lifts once the 3DS challenge is on screen. */
  handleActionHandled: (data: ActionHandledReturnObject) => void;
}

export function createAdyenPaymentHandlers(options: AdyenPaymentHandlersOptions): AdyenPaymentHandlers {
  const {
    configuration,
    handleSuccess,
    handleError,
    setThreeDSecureActive,
    setPaymentInProgress,
    setPaymentProcessing,
    enrichSubmitData,
    onSubmitStart,
  } = options;

  // Buyer-friendly failure message from the host (advanced mode). Set on submit, shown when the payment fails.
  let failureMessage: string | undefined;
  // Why our own /payments or /payments/details call threw. We only actions.reject() there; Adyen then
  // reports the failure through onPaymentFailed, which is where the screen is shown — showing it in the
  // catch as well used to be immediately overwritten by the generic copy from that later callback.
  let thrownFailure: ResultMessage | undefined;

  function dispatchResult(resultCode: ResultCode): void {
    dispatchFinalResult(resultCode, {
      configuration,
      handleSuccess,
      handleError: (message) => handleError(thrownFailure ?? message),
      failureMessage,
    });
  }

  async function handleOnSubmit(state: SubmitData, _: UIElement<UIElementProps>, actions: SubmitActions) {
    onSubmitStart?.();
    thrownFailure = undefined;

    // No beforeSubmit gate here: every entry point (submitCardWithGate for cards, the wallet onClick
    // handler) has already run it exactly once, before Adyen's submit. A reject from this handler can't
    // be a quiet cancel — Adyen only treats its own (unexported) CancelError that way.

    // Lock the rest of the widget for the in-flight window (card entry points already took the lock
    // synchronously; wallets take it here). On any outcome the result/failure screen or the 3DS
    // takeover hides the other methods anyway; the catch clears it defensively.
    setPaymentInProgress?.(true);
    // The overlay stays up through /payments and — for IdentifyShopper — the invisible fingerprint
    // iframe; handleActionHandled lifts it once a challenge is actually visible.
    setPaymentProcessing?.(true);

    try {
      const data = enrichSubmitData ? enrichSubmitData(state.data) : (state.data as AdvancedSubmitState["data"]);

      const { resultCode, action, errorMessage } = await configuration.paymentFlow.submitPayment(data);

      failureMessage = errorMessage;

      if (resultCode === "ChallengeShopper" || resultCode === "IdentifyShopper") {
        setThreeDSecureActive(true);
      }

      // If the /payments request from your server is successful, you must call this to resolve whichever of the listed objects are available.
      // You must call this, even if the result of the payment is unsuccessful.
      actions.resolve({ resultCode, action } as Parameters<SubmitActions["resolve"]>[0]);
    } catch (error) {
      setPaymentInProgress?.(false);
      setPaymentProcessing?.(false);
      thrownFailure = toResultMessage(error, "error.failedToSubmitPayment");
      // Adyen answers with onPaymentFailed -> handlePaymentFailed, which shows thrownFailure.
      actions.reject();
    }
  }

  async function handleOnSubmitAdditionalData(
    state: AdditionalDetailsData,
    _: UIElement<UIElementProps>,
    actions: AdditionalDetailsActions
  ) {
    // Fingerprint or challenge finished: the shopper is waiting on /payments/details again.
    setPaymentProcessing?.(true);

    try {
      const { resultCode, action, errorMessage } = await configuration.paymentFlow.submitAdditionalDetails(state.data);

      failureMessage = errorMessage;

      // If the /payments/details request from your server is successful, you must call this to resolve whichever of the listed objects are available.
      // You must call this, even if the result of the payment is unsuccessful.
      actions.resolve({ resultCode, action } as Parameters<AdditionalDetailsActions["resolve"]>[0]);

      // No dispatch here: Adyen invokes the core-level onPaymentCompleted/onPaymentFailed with this
      // result, and dispatching as well would double-fire the merchant callbacks. (The redirect return,
      // submitDetails, doesn't use these handlers — it calls the payment flow directly.)
    } catch (error) {
      setPaymentProcessing?.(false);
      thrownFailure = toResultMessage(error, "error.failedToSubmitPaymentDetails");
      // Adyen answers the reject with onPaymentFailed, which shows thrownFailure.
      actions.reject();
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

  function handleActionHandled(data: ActionHandledReturnObject): void {
    // Only the challenge is something the shopper can see and act on. The fingerprint iframe is
    // hidden (display:none), so its "loaded" event must NOT lift the overlay.
    if (data.componentType === "3DS2Challenge") {
      setPaymentProcessing?.(false);
    }
  }

  return {
    handleOnSubmit,
    handleOnSubmitAdditionalData,
    handlePaymentCompleted,
    handlePaymentFailed,
    handleActionHandled,
  };
}

/**
 * Core-level Adyen onError for every mounted method. A shopper cancel (closing a wallet sheet) is not
 * an error. Anything else is logged — it used to vanish without a trace — and shown as the generic
 * failure screen.
 *
 * Deliberately does NOT call the host's onPaymentFailed: Adyen also raises onError for conditions it
 * then continues from (e.g. a 3DS challenge timeout still completes via /payments/details and reaches
 * onPaymentCompleted/onPaymentFailed), so reporting here would double-fire the merchant callbacks.
 */
export function createAdyenErrorHandler(
  handleError: (message: ResultMessage) => void,
  source: string
): (error: AdyenCheckoutError, element?: UIElement<UIElementProps>) => void {
  return (error) => {
    if (error?.name === CANCEL) {
      return;
    }
    console.error(`[StraumurCheckout] Adyen error (${source}):`, error);
    handleError({ key: "error.unknownError" });
  };
}
