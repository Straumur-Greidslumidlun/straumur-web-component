import { h } from "preact";
import "./apple-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import ApplePayIcon from "../../assets/icons/applepay";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";
import PaymentMethodItem from "../../components/payment-method-item/payment-method-item";

interface ApplePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function ApplePayComponent({ configuration, paymentMethods }: ApplePayComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { activePaymentMethod, setActivePaymentMethod, threeDSecureActive, isSolePaymentMethod, hasApplePay } =
    usePaymentMethodGroup();

  if (!hasApplePay) {
    return null;
  }

  if (configuration.instantPayments && configuration.instantPayments.some((x) => x === "applepay")) {
    return null;
  }

  if (activePaymentMethod !== "applepay" && threeDSecureActive) {
    return null;
  }

  return (
    <PaymentMethodItem
      icon={<ApplePayIcon />}
      title={i18n.t("applePay.title")}
      isActive={activePaymentMethod === "applepay"}
      isSole={isSolePaymentMethod}
      onChange={() => setActivePaymentMethod("applepay")}
    >
      <ApplePayButton
        configuration={configuration}
        paymentMethods={paymentMethods}
        showPaymentButton={activePaymentMethod === "applepay"}
        isInstantPayment={false}
      />
    </PaymentMethodItem>
  );
}

export default ApplePayComponent;
