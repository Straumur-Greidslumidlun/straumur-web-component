import { h } from "preact";
import "./apple-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import ApplePayIcon from "../../assets/icons/applepay";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";

interface ApplePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function ApplePayComponent({ configuration, paymentMethods }: ApplePayComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { activePaymentMethod, setActivePaymentMethod, threeDSecureActive } = usePaymentMethodGroup();

  const handleBoxChange = () => {
    setActivePaymentMethod("applepay");
  };

  if (configuration.instantPayments && configuration.instantPayments.some((x) => x === "applepay")) {
    return null;
  }

  if (activePaymentMethod !== "applepay" && threeDSecureActive) {
    return null;
  }

  return (
    <label className="straumur__apple-pay-component">
      <input
        type="radio"
        className="straumur__apple-pay-component__radio-selector"
        checked={activePaymentMethod === "applepay"}
        onChange={handleBoxChange}
      />
      <span className="straumur__apple-pay-component__content">
        <span className="straumur__apple-pay-component--circle"></span>
        <ApplePayIcon />
        <span className="straumur__apple-pay-component--text">{i18n.t("applePay.title")}</span>
      </span>
      <div className="straumur__apple-pay-component__expandable">
        <ApplePayButton
          configuration={configuration}
          paymentMethods={paymentMethods}
          showPaymentButton={activePaymentMethod === "applepay"}
          isInstantPayment={false}
        />
      </div>
    </label>
  );
}

export default ApplePayComponent;
