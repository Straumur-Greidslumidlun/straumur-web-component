import { useState } from "preact/hooks";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { runBeforeSubmit } from "../../components/shared/before-submit-click";
import { dispatchFinalResult } from "../../components/shared/dispatch-final-result";
import { toResultMessage } from "../../flows/payment-flow";

// The pay-time wire id the backend routes to the Kortalan provider (matches paymentMethod.type in the
// /payment-methods listing).
export const KORTALAN_TYPE = "kortalan";

// Reads a provider-neutral redirect action off the /payments response. Kortalan (and Adyen redirect
// methods) come back Pending with an Adyen-shaped { type: "redirect", url } action; there is no Adyen
// element to consume it here, so the caller performs the redirect itself.
function getRedirectUrl(action: unknown): string | null {
  if (action && typeof action === "object" && "type" in action && "url" in action) {
    const candidate = action as { type?: unknown; url?: unknown };
    if (candidate.type === "redirect" && typeof candidate.url === "string") {
      return candidate.url;
    }
  }

  return null;
}

/**
 * The Kortalán submit flow, shared by the standalone method row and the express (instant) button.
 * Submits the native `kortalan` method through the payment flow and, on the Pending redirect action,
 * navigates the browser to Kortalán (the return lands back on /additional-details via submitDetails).
 * An outright refusal before any redirect is surfaced in place.
 */
export function useKortalanPay(configuration: StraumurCheckoutConfiguration): {
  pay: () => Promise<void>;
  isSubmitting: boolean;
} {
  const { handleSuccess, handleError, setPaymentInProgress } = usePaymentMethodGroup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pay = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!(await runBeforeSubmit(configuration.paymentFlow))) {
        setIsSubmitting(false);
        return;
      }

      // Lock the rest of the widget for the in-flight window (mirrors the Adyen flow).
      setPaymentInProgress(true);

      // No Adyen client state for a native method — just the method type the backend routes on.
      const { resultCode, action, errorMessage } = await configuration.paymentFlow.submitPayment({
        clientStateDataIndicator: false,
        paymentMethod: { type: KORTALAN_TYPE },
      });

      const redirectUrl = getRedirectUrl(action);
      if (redirectUrl) {
        // Leaving the page for Kortalán; the return lands back on /additional-details via submitDetails.
        // Stay locked — the page is navigating away.
        window.location.assign(redirectUrl);
        return;
      }

      // No redirect (e.g. an outright refusal before the redirect) — surface the outcome in place.
      dispatchFinalResult(resultCode, { configuration, handleSuccess, handleError, failureMessage: errorMessage });
      setPaymentInProgress(false);
      setIsSubmitting(false);
    } catch (error) {
      handleError(toResultMessage(error, "error.failedToSubmitPayment"));
      setPaymentInProgress(false);
      setIsSubmitting(false);
    }
  };

  return { pay, isSubmitting };
}
