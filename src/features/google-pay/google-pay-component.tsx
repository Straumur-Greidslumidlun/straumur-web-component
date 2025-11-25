import { h } from "preact";
import "./google-pay-component.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import { useI18n } from "../../localizations/i18n-context";
import GooglePayIcon from "../../assets/icons/googlepay";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";

interface GooglePayComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function GooglePayComponent({ configuration, paymentMethods }: GooglePayComponentProps): h.JSX.Element | null {
  const { i18n } = useI18n();
  const { activePaymentMethod, setActivePaymentMethod } = usePaymentMethodGroup();

  const handleBoxChange = () => {
    setActivePaymentMethod("googlepay");
  };

  if (configuration.instantPayments && configuration.instantPayments.some((x) => x === "googlepay")) {
    return null;
  }

  return (
    <label className="straumur__google-pay-component">
      <input
        type="radio"
        className="straumur__google-pay-component__radio-selector"
        checked={activePaymentMethod === "googlepay"}
        onChange={handleBoxChange}
      />
      <span className="straumur__google-pay-component__content">
        <span className="straumur__google-pay-component--circle"></span>
        <GooglePayIcon />
        <span className="straumur__google-pay-component--text">{i18n.t("googlePay.title")}</span>
      </span>
      <div className="straumur__google-pay-component__expandable">
        <GooglePayButton
          configuration={configuration}
          paymentMethods={paymentMethods}
          showPaymentButton={activePaymentMethod === "googlepay"}
        />
      </div>
    </label>
  );
}

export default GooglePayComponent;
