import { h } from "preact";
import "./google-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import GooglePayIcon from "../../assets/icons/googlepay";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";

interface GooglePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function GooglePayComponent({ configuration, paymentMethods }: GooglePayComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { activePaymentMethod, setActivePaymentMethod, threeDSecureActive, isSolePaymentMethod, hasGooglePay } =
    usePaymentMethodGroup();

  if (!hasGooglePay) {
    return null;
  }

  if (configuration.instantPayments && configuration.instantPayments.some((x) => x === "googlepay")) {
    return null;
  }

  if (activePaymentMethod !== "googlepay" && threeDSecureActive) {
    return null;
  }

  return (
    <PaymentMethodItem
      icon={<GooglePayIcon />}
      title={i18n.t("googlePay.title")}
      isActive={activePaymentMethod === "googlepay"}
      isSole={isSolePaymentMethod}
      onChange={() => setActivePaymentMethod("googlepay")}
    >
      <GooglePayButton
        configuration={configuration}
        paymentMethods={paymentMethods}
        showPaymentButton={activePaymentMethod === "googlepay"}
        isInstantPayment={false}
      />
    </PaymentMethodItem>
  );
}

export default GooglePayComponent;
