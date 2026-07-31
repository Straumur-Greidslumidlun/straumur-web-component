import { h } from "preact";
import "./kortalan-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";
import KortalanIcon from "../../assets/icons/kortalan";
import { KORTALAN_TYPE, useKortalanPay } from "./use-kortalan-pay";

interface KortalanComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function KortalanComponent({ configuration }: KortalanComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const {
    activePaymentMethod,
    setActivePaymentMethod,
    isObscuredByThreeDS,
    isSolePaymentMethod,
    hasKortalan,
    paymentInProgress,
  } = usePaymentMethodGroup();
  const { pay, isSubmitting } = useKortalanPay(configuration);

  if (!hasKortalan) {
    return null;
  }

  // Placed in instantPayments? It renders only in the express strip; the standalone row stays hidden
  // (mirrors the Google Pay / Apple Pay standalone components).
  if (configuration.instantPayments?.some((x) => x === KORTALAN_TYPE)) {
    return null;
  }

  if (isObscuredByThreeDS(KORTALAN_TYPE)) {
    return null;
  }

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
        disabled={isSubmitting || paymentInProgress}
        onClick={() => void pay()}
      >
        {i18n.t("kortalan.payButton")}
      </button>
    </PaymentMethodItem>
  );
}

export default KortalanComponent;
