import { h } from "preact";
import { useState } from "preact/hooks";
import "./instant-payments-component.css";
import { InstantPaymentMethod, StraumurCheckoutConfiguration } from "../../models/models";
import { SuccessResponse } from "../../services/models";
import GooglePayButton from "../../components/google-pay-button/google-pay-button";
import ApplePayButton from "../../components/apple-pay-button/apple-pay-button";
import KortalanInstantButton from "../kortalan/kortalan-instant-button";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";

interface InstantPaymentsComponentProps {
  configuration: StraumurCheckoutConfiguration;
  paymentMethods: SuccessResponse;
}

// Only these methods may render as express buttons. Kortalán sorts first so it always takes the
// full-width top row (see the layout note below), with the wallets sharing the row beneath it.
const INSTANT_PRIORITY: InstantPaymentMethod[] = ["kortalan", "googlepay", "applepay"];
const WALLET_METHODS: InstantPaymentMethod[] = ["googlepay", "applepay"];

function InstantPaymentsComponent({
  configuration,
  paymentMethods,
}: InstantPaymentsComponentProps): h.JSX.Element | null {
  const { hasGooglePay, hasApplePay, hasKortalan, threeDSecureActive } = usePaymentMethodGroup();
  const [unavailableMethods, setUnavailableMethods] = useState<Set<string>>(new Set());

  const handleUnavailable = (method: string) => {
    setUnavailableMethods((prev) => new Set(prev).add(method));
  };

  if (!configuration.instantPayments) {
    return null;
  }

  const isAvailable = (payment: InstantPaymentMethod): boolean =>
    payment === "googlepay" ? hasGooglePay : payment === "applepay" ? hasApplePay : hasKortalan;

  // Keep only valid, available methods; dedupe (the public type is a plain array, so a merchant could
  // repeat a method) and order by INSTANT_PRIORITY so the layout is deterministic regardless of the
  // order the methods were configured in.
  const configured = new Set(configuration.instantPayments);
  const finalAvailableInstantPayments = INSTANT_PRIORITY.filter((payment) => configured.has(payment)).filter(
    isAvailable
  );

  const visibleInstantPayments = finalAvailableInstantPayments.filter((payment) => !unavailableMethods.has(payment));

  if (finalAvailableInstantPayments.length === 0) {
    return null;
  }

  // Grid columns are driven by the wallet count, not the total: two wallets share a row (two columns),
  // anything else is a single column. Kortalán always spans the full row (see its cell class), so with
  // all three methods present Kortalán sits full-width on top and the two wallets pair beneath it.
  // During a 3DS challenge only the active wallet renders (the others are obscured); force a single
  // column so its challenge iframe fills the full widget width like the card flow.
  const visibleWalletCount = visibleInstantPayments.filter((payment) => WALLET_METHODS.includes(payment)).length;
  const twoColumn = visibleWalletCount > 1 && !threeDSecureActive;

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
      {/* Render the visible (available) methods only. Every wallet still mounts on first render
          (visibleInstantPayments starts equal to finalAvailableInstantPayments) so isAvailable()
          runs; a wallet that reports unavailable is dropped here and unmounts, collapsing its cell
          instead of leaving an empty fixed-height (48px) button behind. Kortalán has no async
          availability check, so it never drops. */}
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
        if (paymentMethod === "kortalan") {
          // Wrapped in a full-width grid cell so Kortalán spans the row above the wallets.
          return (
            <div key={paymentMethod} className="straumur__instant-payments__full instant-payments__full">
              <KortalanInstantButton configuration={configuration} />
            </div>
          );
        }

        // this should never happen due to our filtering above, but typescript safeguard
        return null;
      })}
    </div>
  );
}

export default InstantPaymentsComponent;
