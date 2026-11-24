import { ResultCode, ResultMessage, StraumurCheckoutConfiguration } from "../../models/models";

// Merchant callbacks follow Adyen Web 6 semantics: these resultCodes are failures.
export const FAILED_RESULT_CODES: readonly ResultCode[] = ["Refused", "Cancelled", "Error"];

// Accepted, with the final outcome arriving asynchronously (e.g. via webhook): neither a success nor
// a failure the shopper should be told about — they get a neutral "being processed" screen.
export const PENDING_RESULT_CODES: readonly ResultCode[] = ["Pending", "Received"];

export interface DispatchFinalResultDeps {
  configuration: Pick<StraumurCheckoutConfiguration, "onPaymentCompleted" | "onPaymentFailed"> &
    Partial<Pick<StraumurCheckoutConfiguration, "logger">>;
  handleSuccess: (message: ResultMessage) => void;
  handleError: (message: ResultMessage) => void;
  /** Buyer-friendly failure message from the host (advanced mode); overrides the generic failure copy. */
  failureMessage?: string;
  /** The method that was paid with, for the diagnostics log (unknown on a redirect return). */
  paymentMethod?: string;
}

/**
 * The single place a final payment outcome is turned into a built-in result screen plus the matching
 * merchant callback. Shared by the Adyen handlers, the native (Kortalan) flow, and the redirect-return
 * submit so all three route outcomes identically.
 *
 * Screens: Authorised → success; Pending/Received → "being processed"; anything else → failure.
 * Callbacks keep Adyen Web 6 semantics: Refused/Cancelled/Error → onPaymentFailed, everything else
 * (including Pending/Received/PresentToShopper) → onPaymentCompleted.
 */
export function dispatchFinalResult(resultCode: ResultCode, deps: DispatchFinalResultDeps): void {
  const { configuration, handleSuccess, handleError, failureMessage, paymentMethod } = deps;
  let screen: "success" | "pending" | "failure";

  if (resultCode === "Authorised") {
    screen = "success";
    handleSuccess({ key: "success.paymentAuthorized" });
  } else if (PENDING_RESULT_CODES.includes(resultCode)) {
    // Was the "Payment unsuccessful" screen — wrong for a payment that was accepted for processing.
    screen = "pending";
    handleSuccess({ key: "success.paymentPending" });
  } else {
    screen = "failure";
    handleError(failureMessage ? { text: failureMessage } : { key: "error.paymentUnsuccessful" });
  }

  const failed = FAILED_RESULT_CODES.includes(resultCode);
  let hostCallbackThrew = false;

  // The host's callback runs last and isolated: if it throws, that's the host's bug and must not flip
  // the reported outcome — callers' catch blocks (submitDetails, Kortalán) would otherwise also fire
  // onPaymentFailed and show the failure screen after a genuine authorisation.
  try {
    if (failed) {
      configuration.onPaymentFailed?.({ resultCode });
    } else {
      configuration.onPaymentCompleted?.({ resultCode });
    }
  } catch (error) {
    hostCallbackThrew = true;
    console.error(`[StraumurCheckout] ${failed ? "onPaymentFailed" : "onPaymentCompleted"} threw:`, error);
  }

  configuration.logger?.log("payment.finalResult", { paymentMethod, resultCode, screen, hostCallbackThrew });
}
