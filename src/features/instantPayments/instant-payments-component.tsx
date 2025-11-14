import { h } from "preact";
import "./instant-payments-component.css";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";

interface InstantPaymentsComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function InstantPaymentsComponent({
  configuration,
  paymentMethods,
}: InstantPaymentsComponentProps): h.JSX.Element | null {
  if (!configuration.instantPayments || configuration.instantPayments.length === 0) {
    return null;
  }

  return (
    <div class="instant-payments">
      {configuration.instantPayments.some((x) => x === "googlepay") && (
        <GooglePayButton configuration={configuration} paymentMethods={paymentMethods} showPaymentButton={true} />
      )}
      {configuration.instantPayments.some((x) => x === "applepay") && (
        <ApplePayButton configuration={configuration} paymentMethods={paymentMethods} showPaymentButton={true} />
      )}
    </div>
  );
}

export default InstantPaymentsComponent;
