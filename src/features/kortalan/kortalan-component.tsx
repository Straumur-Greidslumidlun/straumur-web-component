import { h } from "preact";
import { useState } from "preact/hooks";
import "./kortalan-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import { runBeforeSubmit } from "../../components/shared/before-submit-click";
import { dispatchFinalResult } from "../../components/shared/dispatch-final-result";
import { toResultMessage } from "../../flows/payment-flow";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";
import KortalanIcon from "../../assets/icons/kortalan";

interface KortalanComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

// The pay-time wire id the backend routes to the Kortalan provider (matches paymentMethod.type in the
// /payment-methods listing).
const KORTALAN_TYPE = "kortalan";

// Reads a provider-neutral redirect action off the /payments response. Kortalan (and Adyen redirect
// methods) come back Pending with an Adyen-shaped { type: "redirect", url } action; there is no Adyen
// element to consume it here, so this component performs the redirect itself.
function getRedirectUrl(action: unknown): string | null {
  if (action && typeof action === "object" && "type" in action && "url" in action) {
    const candidate = action as { type?: unknown; url?: unknown };
    if (candidate.type === "redirect" && typeof candidate.url === "string") {
      return candidate.url;
    }
  }

  return null;
}

function KortalanComponent({ configuration }: KortalanComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isObscuredByThreeDS,
    isSolePaymentMethod,
    hasKortalan,
    handleSuccess,
    handleError,
  } = usePaymentMethodGroup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hasKortalan) {
    return null;
  }

  if (isObscuredByThreeDS(KORTALAN_TYPE)) {
    return null;
  }

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

      // No Adyen client state for a native method — just the method type the backend routes on.
      const { resultCode, action, errorMessage } = await configuration.paymentFlow.submitPayment({
        clientStateDataIndicator: false,
        paymentMethod: { type: KORTALAN_TYPE },
      });

      const redirectUrl = getRedirectUrl(action);
      if (redirectUrl) {
        // Leaving the page for Kortalán; the return lands back on /additional-details via submitDetails.
        window.location.assign(redirectUrl);
        return;
      }

      // No redirect (e.g. an outright refusal before the redirect) — surface the outcome in place.
      dispatchFinalResult(resultCode, { configuration, handleSuccess, handleError, failureMessage: errorMessage });
      setIsSubmitting(false);
    } catch (error) {
      handleError(toResultMessage(error, "error.failedToSubmitPayment"));
      setIsSubmitting(false);
    }
  };

  return (
    <PaymentMethodItem
      icon={<KortalanIcon />}
      title={i18n.t("kortalan.title")}
      isActive={activePaymentMethod === KORTALAN_TYPE}
      isSole={isSolePaymentMethod}
      onChange={() => setActivePaymentMethod(KORTALAN_TYPE)}
    >
      <button
        className="straumur__kortalan-component__submit-button"
        disabled={isSubmitting}
        onClick={() => void pay()}
      >
        {i18n.t("kortalan.payButton")}
      </button>
    </PaymentMethodItem>
  );
}

export default KortalanComponent;
