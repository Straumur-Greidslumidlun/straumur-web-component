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

  const visibleInstantPayments = finalAvailableInstantPayments.filter((payment) => !unavailableMethods.has(payment));

  if (finalAvailableInstantPayments.length === 0) {
    return null;
  }

  return (
    // The unprefixed instant-payments classes predate the straumur__ convention and may be
    // targeted by host-page styles; keep them alongside the prefixed ones.
    <div
      className={`straumur__instant-payments instant-payments ${
        visibleInstantPayments.length > 1
          ? "straumur__instant-payments--multiple instant-payments--multiple"
          : "straumur__instant-payments--single instant-payments--single"
      }`}
      style={{ display: visibleInstantPayments.length === 0 ? "none" : undefined }}
    >
      {/* Render the visible (available) wallets only. Every wallet still mounts on first render
          (visibleInstantPayments starts equal to finalAvailableInstantPayments) so isAvailable()
          runs; a wallet that reports unavailable is dropped here and unmounts, collapsing its cell
          instead of leaving an empty fixed-height (48px) button behind. */}
      {visibleInstantPayments.map((paymentMethod) => {
        if (paymentMethod === "googlepay") {
          return (
            <GooglePayButton
              key={paymentMethod}
              configuration={configuration}
              paymentMethods={paymentMethods}
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
