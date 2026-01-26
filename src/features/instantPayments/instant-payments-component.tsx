import { h } from "preact";
import "./instant-payments-component.css";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";
import { PaymentMethod } from "../../models/constants";

interface InstantPaymentsComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function InstantPaymentsComponent({
  configuration,
  paymentMethods,
}: InstantPaymentsComponentProps): h.JSX.Element | null {
  if (!configuration.instantPayments) {
    return null;
  }

  // safeguard: filter out any invalid payment methods, only allow applepay and googlepay
  const validInstantPayments: Extract<PaymentMethod, "googlepay" | "applepay">[] = ["googlepay", "applepay"];
  const availableInstantPayments = configuration.instantPayments.filter((payment) =>
    validInstantPayments.includes(payment)
  );

  const availableWalletPayments = paymentMethods.paymentMethods.paymentMethods?.filter(x => x.type === "applepay" || x.type === "googlepay") || [];

  // another safeguard: ensure that the payment methods are actually available from the paymentMethods response
  const finalAvailableInstantPayments = availableInstantPayments.filter((payment) =>
    availableWalletPayments.some(pm => pm.type === payment)
  );

  if (finalAvailableInstantPayments.length === 0) {
    return null;
  }

  return (
    <div
      class={`instant-payments ${
        finalAvailableInstantPayments.length > 1 ? "instant-payments--multiple" : "instant-payments--single"
      }`}
    >
      {finalAvailableInstantPayments.map((paymentMethod) => {
        if (paymentMethod === "googlepay") {
          return (
            <GooglePayButton
              key={paymentMethod}
              configuration={configuration}
              paymentMethods={paymentMethods}
              showPaymentButton={true}
              isInstantPayment={true}
            />
          );
        }
        if (paymentMethod === "applepay") {
          return (
            <ApplePayButton
              key={paymentMethod}
              configuration={configuration}
              paymentMethods={paymentMethods}
              showPaymentButton={true}
              isInstantPayment={true}
            />
          );
        }

        // this should never happen due to our filtering above, but typescript safeguard
        return null;
      })}
    </div>
  );
}

export default InstantPaymentsComponent;
