import { h } from "preact";
import { useState } from "preact/hooks";
import "./instant-payments-component.css";
import { InstantPaymentMethod, StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface InstantPaymentsComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

// The methods that may render as express buttons. Used only to validate the configured tokens — the
// render order follows the merchant's `instantPayments` array, not this list.
const INSTANT_METHODS: InstantPaymentMethod[] = ["googlepay", "applepay"];

function InstantPaymentsComponent({
  configuration,
  paymentMethods,
}: InstantPaymentsComponentProps): h.JSX.Element | null {
  const { hasGooglePay, hasApplePay, threeDSecureActive } = usePaymentMethodGroup();
  const [unavailableMethods, setUnavailableMethods] = useState<Set<string>>(new Set());

  const handleUnavailable = (method: string) => {
    setUnavailableMethods((prev) => new Set(prev).add(method));
  };

  if (!configuration.instantPayments) {
    return null;
  }

  const isAvailable = (payment: InstantPaymentMethod): boolean =>
    payment === "googlepay" ? hasGooglePay : hasApplePay;

  // Preserve the merchant's configured order (that order drives the layout); drop invalid tokens,
  // duplicates (the public type is a plain array, so a merchant could repeat one), and unavailable
  // methods.
  const seen = new Set<InstantPaymentMethod>();
  const finalAvailableInstantPayments = configuration.instantPayments.filter((payment) => {
    if (seen.has(payment) || !INSTANT_METHODS.includes(payment)) {
      return false;
    }

    seen.add(payment);
    return isAvailable(payment);
  });

  const visibleInstantPayments = finalAvailableInstantPayments.filter((payment) => !unavailableMethods.has(payment));

  if (finalAvailableInstantPayments.length === 0) {
    return null;
  }

  // Express buttons flow two-up in the order the merchant listed them. An odd number leaves the last
  // button alone on its row, so span it full width (e.g. 3 buttons: two on top, the third full-width
  // below). During a 3DS challenge only the active wallet renders (others are obscured); force a
  // single column so its challenge iframe fills the full widget width like the card flow.
  const twoColumn = visibleInstantPayments.length > 1 && !threeDSecureActive;
  const spanLastFull = twoColumn && visibleInstantPayments.length % 2 === 1;

  return (
    // The unprefixed instant-payments classes predate the straumur__ convention and may be
    // targeted by host-page styles; keep them alongside the prefixed ones.
    <div
      className={`straumur__instant-payments instant-payments ${
        twoColumn
          ? "straumur__instant-payments--multiple instant-payments--multiple"
          : "straumur__instant-payments--single instant-payments--single"
      }`}
      style={{ display: visibleInstantPayments.length === 0 ? "none" : undefined }}
    >
      {/* Render the visible (available) methods only, each in its own grid cell in the configured
          order. Every wallet still mounts on first render (visibleInstantPayments starts equal to
          finalAvailableInstantPayments) so isAvailable() runs; a wallet that reports unavailable is
          dropped here and unmounts, collapsing its cell. The lone trailing cell in an odd count spans
          the full width. */}
      {visibleInstantPayments.map((paymentMethod, index) => {
        const spanFull = spanLastFull && index === visibleInstantPayments.length - 1;

        return (
          <div
            key={paymentMethod}
            className={spanFull ? "straumur__instant-payments__full instant-payments__full" : ""}
          >
            {paymentMethod === "googlepay" && (
              <GooglePayButton
                configuration={configuration}
                paymentMethods={paymentMethods}
                isInstantPayment={true}
                onUnavailable={() => handleUnavailable("googlepay")}
              />
            )}
            {paymentMethod === "applepay" && (
              <ApplePayButton
                configuration={configuration}
                paymentMethods={paymentMethods}
                isInstantPayment={true}
                onUnavailable={() => handleUnavailable("applepay")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default InstantPaymentsComponent;
