import { h } from "preact";
import { useState } from "preact/hooks";
import "./instant-payments-component.css";
import { StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";
import { PaymentMethod } from "../../models/constants";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface InstantPaymentsComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

function InstantPaymentsComponent({
  configuration,
  paymentMethods,
}: InstantPaymentsComponentProps): h.JSX.Element | null {
  const { hasGooglePay, hasApplePay } = usePaymentMethodGroup();
  const [unavailableMethods, setUnavailableMethods] = useState<Set<string>>(new Set());

  const handleUnavailable = (method: string) => {
    setUnavailableMethods((prev) => new Set(prev).add(method));
  };

  if (!configuration.instantPayments) {
    return null;
  }

  // safeguard: filter out any invalid payment methods, only allow applepay and googlepay
  const validInstantPayments: Extract<PaymentMethod, "googlepay" | "applepay">[] = ["googlepay", "applepay"];
  const availableInstantPayments = configuration.instantPayments.filter((payment) =>
    validInstantPayments.includes(payment)
  );

  // ensure the payment method is actually available from the paymentMethods response
  const finalAvailableInstantPayments = availableInstantPayments.filter((payment) =>
    payment === "googlepay" ? hasGooglePay : hasApplePay
  );

  const visibleInstantPayments = finalAvailableInstantPayments.filter(
    (payment) => !unavailableMethods.has(payment)
  );

  if (finalAvailableInstantPayments.length === 0) {
    return null;
  }

  return (
    <div
      class={`instant-payments ${
        visibleInstantPayments.length > 1 ? "instant-payments--multiple" : "instant-payments--single"
      }`}
      style={{ display: visibleInstantPayments.length === 0 ? "none" : undefined }}
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
              onUnavailable={() => handleUnavailable("googlepay")}
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
              onUnavailable={() => handleUnavailable("applepay")}
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
