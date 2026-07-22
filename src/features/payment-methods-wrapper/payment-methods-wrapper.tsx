import { Fragment, h, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./payment-methods-wrapper.css";
import { usePaymentMethodGroup } from "../../components/payment-method-group/payment-method-group-context";
import LoaderIcon from "../../assets/icons/loader";

interface PaymentMethodsWrapperProps {
  children: ComponentChildren;
}

// Fallback reveal so a method that never reports ready (e.g. a wallet stalling on isAvailable())
// can't leave the shopper on an infinite loader.
const REVEAL_TIMEOUT_MS = 4000;

function PaymentMethodsWrapper({ children }: PaymentMethodsWrapperProps): h.JSX.Element | null {
  const {
    error,
    success,
    hasGooglePay,
    hasApplePay,
    isPaymentMethodInitialized,
    isStoredCardInitialized,
    activePaymentMethod,
    activeStoredPaymentMethodId,
  } = usePaymentMethodGroup();

  const [revealed, setRevealed] = useState(false);

  // Wallets initialize on mount regardless of selection, so always wait for the ones that exist.
  const walletsReady =
    (!hasGooglePay || isPaymentMethodInitialized.googlepay) && (!hasApplePay || isPaymentMethodInitialized.applepay);

  // Card and stored cards initialize lazily — only once they're the active (expanded) method — so
  // only wait for whichever one is open on load. A collapsed card/stored card never initializes
  // until it's selected, which happens after the form is revealed.
  let activeReady = true;
  if (activePaymentMethod === "card") {
    activeReady = isPaymentMethodInitialized.card;
  } else if (activePaymentMethod === "storedcard") {
    activeReady = activeStoredPaymentMethodId ? Boolean(isStoredCardInitialized[activeStoredPaymentMethodId]) : true;
  }

  const ready = walletsReady && activeReady;

  useEffect(() => {
    if (ready) {
      setRevealed(true);
    }
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), REVEAL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  if (error || success) {
    return null;
  }

  return (
    <Fragment>
      {!revealed && (
        <div className="straumur__master-loader" role="status">
          <LoaderIcon />
        </div>
      )}
      {/* The methods are always rendered so each one can initialize, but they're kept visually hidden
          behind the single master loader until everything is ready — no per-method loader flicker. */}
      <div className={`straumur__methods${revealed ? "" : " straumur__methods--loading"}`}>{children}</div>
    </Fragment>
  );
}

export default PaymentMethodsWrapper;
