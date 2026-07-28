import { ResultCode, ResultMessage, StraumurCheckoutConfiguration } from "../../models/models";

// Merchant callbacks follow Adyen Web 6 semantics: these resultCodes are failures.
export const FAILED_RESULT_CODES: readonly ResultCode[] = ["Refused", "Cancelled", "Error"];

export interface DispatchFinalResultDeps {
  configuration: Pick<StraumurCheckoutConfiguration, "onPaymentCompleted" | "onPaymentFailed">;
  handleSuccess: (message: ResultMessage) => void;
  handleError: (message: ResultMessage) => void;
  /** Buyer-friendly failure message from the host (advanced mode); overrides the generic failure copy. */
  failureMessage?: string;
}

/**
 * The single place a final payment outcome is turned into a built-in result screen plus the matching
 * merchant callback. Shared by the Adyen handlers, the native (Kortalan) flow, and the redirect-return
 * submit so all three route outcomes identically.
 */
export function dispatchFinalResult(resultCode: ResultCode, deps: DispatchFinalResultDeps): void {
  const { configuration, handleSuccess, handleError, failureMessage } = deps;

  // The built-in screens keep their own rule: the success screen only for Authorised.
  if (resultCode === "Authorised") {
    handleSuccess({ key: "success.paymentAuthorized" });
  } else {
    handleError(failureMessage ? { text: failureMessage } : { key: "error.paymentUnsuccessful" });
  }

  if (FAILED_RESULT_CODES.includes(resultCode)) {
    configuration.onPaymentFailed?.({ resultCode });
  } else {
    configuration.onPaymentCompleted?.({ resultCode });
  }
}
